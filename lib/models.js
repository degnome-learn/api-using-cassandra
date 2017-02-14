const Joi = require('joi');
const uuid = require('node-uuid');

const Model = function() {
  let self = this;

  self.Schema = function Schema () {
    return {
      id: Joi.string().guid(),
      title: Joi.string(),
      description: Joi.string(),
      active: Joi.boolean(),
      list: Joi.array()
    };
  };

  self.Item = function Item (args) {
    const {
      id = uuid.v4(),
      name = '',
      description = 'Description',
      active = true,
      list = []
    } = args || {};

    return {
      id: id,
      name: name,
      description: description,
      active: active,
      list: list,
      toJson: function toJson (){
        let data = JSON.stringify(this);
        return JSON.parse(data);
      },
      errors: function errors () {
        let schemaErrors = [];
        schemaErrors = schemaErrors.filter(err => err !== null);
        if (schemaErrors.length > 0) return schemaErrors;
        else return null;
      }
    };
  };

  self.PageResult = function PageResult () {
    return {
      pages: 0,
      currentPage: 0,
      count: 0,
      list: []
    };
  };

  self.Response = function Response ({success = false, message = null, data = null} = {}) {
    return {
      success: success,
      message: message,
      data: data
    };
  };

  return self;
};

module.exports = new Model();
