const moment = require('moment');

module.exports = {
    formatDate: function (date, format) {
        return moment(date).format(format);
    },
      // Para comparar valores en Handlebars
    eq: function (a, b) {
        return a === b;
    },
    jsonPretty: function (value) {
    if (typeof value === "object") {
        return JSON.stringify(value, null, 2); // indentado
    }
    return value;
    }
};
