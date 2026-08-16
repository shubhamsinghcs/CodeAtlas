module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name === 'esbuild') {
        delete pkg.scripts;
      }
      return pkg;
    },
  },
};
