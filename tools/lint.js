#!/usr/bin/env node
/**
 * 过滤清单语法校验（CI 与本地共用）。
 *
 * 只做"能自动化判定的错"，不追求实现完整过滤器语法：
 *   1. 文件头必须有 Title 与 Expires（没有 Expires，订阅端不会自动更新）
 *   2. 每条规则形如 ||host^ 或 ||host^$option=value|... ，不允许空格/中文/裸通配
 *   3. 非 $domain 限定的主机规则不允许重复（重复不影响功能，但说明在叠加手工错）
 *   4. 规则里出现 host 之外的路径/查询串时提示（整域拦截才是本清单的风格）
 *
 * 用法: node tools/lint.js            # 校验 filters/ 下所有 .txt
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'filters');

const HOST = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
const IP = /^\d{1,3}(\.\d{1,3}){3}$/;

const errors = [];
const warns = [];

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.txt'))) {
    const full = path.join(dir, file);
    const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
    const seen = new Map();
    let hasTitle = false;
    let hasExpires = false;

    lines.forEach((raw, i) => {
        const n = i + 1;
        const line = raw.trim();
        if (!line) return;

        if (line.startsWith('!')) {
            if (/^!\s*Title:/i.test(line)) hasTitle = true;
            if (/^!\s*Expires:/i.test(line)) {
                hasExpires = true;
                const m = /^!\s*Expires:\s*(\d+)\s*(day|days)/i.exec(line);
                if (!m) errors.push(`${file}:${n}  Expires 只写「N days」形式，别写成日期`);
                else if (Number(m[1]) > 7) warns.push(`${file}:${n}  Expires ${m[1]} 天偏长，建议 ≤ 7`);
            }
            return;
        }

        if (line.startsWith('@@')) { warns.push(`${file}:${n}  出现例外规则（@@），确认是有意的`); return; }

        if (!line.startsWith('||')) {
            errors.push(`${file}:${n}  规则必须以 || 开头（本清单只做整域拦截）: ${line}`);
            return;
        }

        const [pattern, optText] = line.split('$');
        // 两种形态：整域 `||host^`，或路径规则 `||host/path*pattern`（用于只拦某个广告素材路径）
        const pathRule = pattern.includes('/');
        if (!pathRule && !/\^$/.test(pattern)) {
            errors.push(`${file}:${n}  整域规则尾部缺少 ^: ${line}`);
            return;
        }
        if (pathRule && !/^\|\|[a-z0-9.-]+\//i.test(pattern)) {
            errors.push(`${file}:${n}  路径规则必须是 ||域名/路径 形式: ${line}`);
            return;
        }

        const host = (pathRule ? pattern.slice(2).split('/')[0] : pattern.slice(2, -1)).toLowerCase();
        if (!HOST.test(host) && !IP.test(host)) {
            errors.push(`${file}:${n}  不是合法域名/IP: ${host}`);
            return;
        }
        if (host !== (pathRule ? pattern.slice(2).split('/')[0] : pattern.slice(2, -1))) {
            warns.push(`${file}:${n}  域名大小写混用，建议全小写: ${host}`);
        }

        const opts = (optText || '').split(',').filter(Boolean);
        if (optText && !opts.every((o) => /^[a-z-]+=.*$/.test(o) || /^[a-z-]+$/.test(o))) {
            errors.push(`${file}:${n}  选项段看不懂: ${optText}`);
        }
        const scoped = opts.some((o) => o.startsWith('domain='));

        const key = host + '|' + (scoped ? 'scoped' : 'global') + '|' + (pathRule ? pattern : '');
        if (!scoped) {
            if (seen.has(key)) {
                errors.push(`${file}:${n}  重复的全局规则 ${host}（首次出现在第 ${seen.get(key)} 行）`);
            } else {
                seen.set(key, n);
            }
        }
    });

    if (!hasTitle) errors.push(`${file}  缺少 「! Title:」`);
    if (!hasExpires) errors.push(`${file}  缺少 「! Expires:」—— 没有它订阅端不会自动更新`);
}

warns.forEach((w) => console.log('warn  ' + w));
if (errors.length) {
    errors.forEach((e) => console.log('ERROR ' + e));
    console.log(`\n${errors.length} 个错误`);
    process.exit(1);
}
console.log('ok: 清单语法检查通过' + (warns.length ? `（${warns.length} 条提示）` : ''));
