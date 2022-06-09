if (require.main === module) {
  import('./index.js').then(index => {
    process.stdout.write(index.default(process.argv[2]));
  });
}
