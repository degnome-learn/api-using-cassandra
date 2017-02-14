module.exports = {
  fields: {
    id: {
      type: 'text'
    },
    name: {
      type: 'text',
      default: null
    },
    description: {
      type: 'text',
      default: null
    },
    list: {
      type: 'list',
      typeDef: '<varchar>'
    }
  },
  key: ['id'],
  indexes: ['name', 'list']
};
