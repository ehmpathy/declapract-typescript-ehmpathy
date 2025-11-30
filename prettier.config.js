// ref: http://json.schemastore.org/prettierrc

module.exports = {
  trailingComma: 'all',
  tabWidth: 2,
  singleQuote: true,
  plugins: ['@trivago/prettier-plugin-sort-imports'],
  importOrder: ['^[./]'],
  importOrderSeparation: true,
};
