module.exports = {
    inputFiles: ["./lib"],
    mode: "file",
    includeDeclarations: true,
    tsconfig: "tsconfig.json",
    out: "./docs",
    excludePrivate: true,
    excludeProtected: true,
    excludeExternals: true,
    excludeNotExported: true,
    readme: "README.md",
    name: "RssEmitter",
    ignoreCompilerErrors: true,
    listInvalidSymbolLinks: true
};
