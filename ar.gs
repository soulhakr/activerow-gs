/** @namespace ActiveRowService */
/**
 * Caches Table and provides a factory method to generate them.
 */
var ActiveRowService = ActiveRowService || (function (app, global) {

  /**
   * Creates a Table model.
   * @constructor Table
   * @param {Object} sheet
   * @param {String} name
   * @param {Object} option
   */
  var Table = function (sheet, name, option) {
    var myTable = {}, // public prototype
      schemaCols = [],
      columnName = "",
      newColumnName = "",
      defaultOpts = {
        headerRowIndex: 1,
        headerColumnStartIndex: 1
      };

    // for column function
    myTable.column = [];

    // for inverse column function
    myTable.inverseColumn = [];

    // set option to defaults if option not undefined, or empty
    option = (typeof option === "undefined" || Object.keys.call(option).length === 0) ? {} : option;

    // if option is missing headerRowIndex or headerColumnStartIndex add defaults
    if (typeof option.headerRowIndex === "undefined") {
      option.headerRowIndex = 1;
    }
    if (typeof option.headerColumnStartIndex === "undefined") {
      option.headerColumnStartIndex = 1;
    }

    // if sheet is undefined or null throw error
    if (typeof name === "undefined" || name === null) {
      sheet = SpreadsheetApp.getActiveSheet();
      if (sheet === null) {
        throw {
          name: "TableNotNamedError",
          message: "Table name undefined."
        };
      } else {
        myTable.name = name;
      }
    }

    // if sheet is undefined or null throw error
    if (typeof sheet === "undefined" || sheet === null) {
      sheet = SpreadsheetApp.getActiveSheet();
      if (sheet === null) {
        throw {
          name: "SheetNotFoundError",
          message: "Sheet: " + name + " was not found"
        };
      } else {
        myTable.sheet = sheet;
      }
    }

    schemaCols = sheet.getRange(option.headerRowIndex, option.headerColumnStartIndex, 1, sheet.getLastColumn())
      .getValues();

    // set initial options
    myTable.option = option;

    // add findByXXX methods
    for (index = schemaCols[0].length - 1; index >= 0; index -= 1) {
      columnName = schemaCols[0][index];
      capitalizedColumnName = columnName.charAt(0).toUpperCase() + columnName.slice(1);
      newColumnName = "findBy" + capitalizedColumnName;
      myTable.column[columnName] = index + 1;
      myTable.inverseColumn[index] = columnName;
      myTable[newColumnName] = function () {
        var methodName = columnName.slice(0);
        return function (data) {
          var whereParams = {};
          whereParams[methodName] = data;
          return myTable.where(whereParams);
        };
      }();
    }

    /**
     * Find table row by the Id column common to most table schemas.
     * @method find
     * @memberof Table
     * @param {String} id
     * @return {Array}
     */
    myTable.find = function (id) {
      return this.where({
        id: id
      });
    }

    /**
     * Description
     * @method count
     * @memberof Table
     * @param {Object} option
     * @return MemberExpression
     */
    myTable.count = function (option) {
      var keys = Object.keys(option),
        hitRowIndexes = this.getRowIndices(keys[0], option[keys[0]]);
      return hitRowIndexes.length;
    }

    /**
     * Description
     * @method where
     * @memberof Table
     * @param {} option
     * @return result
     */
    myTable.where = function (option) {
      var result = [],
        keys = Object.keys(option),
        index = 0,
        vindex = 0,
        hitRowIndexes = [];

      // filter out rows that don't contain each key, one key at a time.
      for (index = keys.length - 1; index >= 0; index -= 1) {
        if (hitRowIndexes.length !== 0) {
          hitRowIndexes = this.getRowIndices(keys[index], option[keys[index]], hitRowIndexes);
        } else {
          hitRowIndexes = this.getRowIndices(keys[index], option[keys[index]]);
        }
      }

      if (hitRowIndexes.length === 0) {
        return result;
      }

      for (index = hitRowIndexes.length - 1; index >= 0; index -= 1) {
        var tmpResult = {};
        //Logger.log("("+(typeof hitRowIndexes[index])+") hitRowIndexes["+index+"]:"+hitRowIndexes[index]); // debug (solved: off-by-1 error)
        var rowValues = this.sheet.getRange(hitRowIndexes[index],
          this.option.headerColumnStartIndex,
          1,
          this.sheet.getLastColumn()).getValues();

        for (vindex = rowValues[0].length - 1; vindex >= 0; vindex -= 1) {
          tmpResult[this.inverseColumn[vindex]] = rowValues[0][vindex];
        }

        if (Object.keys(tmpResult).length !== 0) {
          result.push(tmpResult);
        }
      }
      return result;

    }

    /**
     * Description
     * @method getOption
     * @memberof Table
     * @return MemberExpression
     */
    myTable.getOption = function () {
      return this.option;
    }

    /**
     * Description
     * @method setOption
     * @memberof Table
     * @param {} option
     * @return ThisExpression
     */
    myTable.setOption = function (option) {
      this.option = option;
      return this;
    }

    /**
     * Description
     * @method getColumn
     * @memberof Table
     * @param {} colName
     * @return LogicalExpression
     */
    myTable.getColumn = function (colName) {
      return this.column[colName] || -1;
    }

    /**
     * Description
     * @method getInverseColumn
     * @memberof Table
     * @param {Number} index
     * @return ConditionalExpression
     */
    myTable.getInverseColumn = function (index) {
      return (typeof index === "NaN" || typeof index === "undefined" || index === null || index < 1) ?
        null : this.inverseColumn[index - 1];
    }

    /**
     * Returns Array of relative row indices for cell values matching `data` in `column` of spreadsheet.
     * @method getRowIndices
     * @memberof Table
     * @param {String} column column name
     * @param {String} data data to search for in column
     * @param {Array} range range to limit the search to (undefined for no limit)
     * @return {Array}
     */
    myTable.getRowIndices = function (column, data, range) {

      var hitRowIndexes = [],
        index = 0,
        max = 0,
        relativeIndex = 0,
        limited = (typeof range !== "undefined"),
        columnIndex = this.getColumn(column);

      if (columnIndex === -1) {
        return hitRowIndexes;
      }

      var dataRowStartIndex = this.option.headerRowIndex + 1;

      var columnValues = this.sheet.getRange(dataRowStartIndex,
        columnIndex,
        this.sheet.getLastRow()).getValues();

      for (index = 0, max = columnValues.length; index < max; index += 1) {

        relativeIndex = dataRowStartIndex + index;

        if (columnValues[index][0] === data) {
          if (limited && range.indexOf(relativeIndex) === -1) {
            continue;
          }
          hitRowIndexes.push(relativeIndex);
        }
      }

      return hitRowIndexes;

    }

    return myTable;

  }

  /**
   * Shallow object comparison utility function. Returns true if all keys in ObjA are shared by ObjB.
   * @private
   * @method hasSameKeys
   * @memberof Table
   * @param {Object} objA
   * @param {Object} objB
   * @return LogicalExpression
   */
  function hasSameKeys(objA, objB) {
    var objAKeys = Object.keys(objA);
    var objBKeys = Object.keys(objB);

    return (objAKeys.length === objBKeys.length && objAKeys.every(function (key) {
      return objBKeys.indexOf(key) !== -1;
    }));
  }

  return {
    // public
    /**
     * Table Factory method. Returns new Table model
     * @method ActiveRowService~getTable
     * @param {Object} sheet
     * @param {String} name
     * @param {Object} option
     * @return {Object}
     */
    getTable: function (sheet, name, option) {

      var cache = (typeof ActiveRowService.cache !== "undefined") ? ActiveRowService.cache : [],
        t = cache[name] = (cache.indexOf(name) !== -1) ? ((typeof option !== "undefined" && hasSameKeys(
          t.getOption(), option)) ? t.setOption(option) : cache[name]) : new Table(sheet, name, option);

      ActiveRowService.cache = cache;
      return t;
    }
  }
})(ActiveRowService, this);
