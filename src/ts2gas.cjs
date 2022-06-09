import('./index.js').then(index => {
  if (require.main === module) {
    process.stdout.write(index.default(process.argv[2]));
  } else {
    module.exports.default = index.default;
  }
});