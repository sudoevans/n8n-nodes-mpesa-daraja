const { src, dest } = require('gulp');

function copyIcons() {
    return src('nodes/**/*.{svg,png}').pipe(dest('dist/nodes'));
}

exports['build:icons'] = copyIcons;
exports.default = copyIcons;
