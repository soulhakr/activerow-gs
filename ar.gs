/** ar.gs */
/**
 * https://github.com/soulhakr/activerow-gs
 */
 (function(global) {
    /**
     * Holds functionality related to the ActiveRow
     * Use Cases:
     *   ActiveRecordService.createRecordSet('Sheet 1').where({name: 'nick'});
     *   // => returns [{id: 1, name: nick, email: 'nick@example.com'}]
     * @namespace ActiveRecordService
     */
     var ActiveRecordService = {};
      /**
       * Returns specified google sheet name as an RecordSet object
       * @param {String} name   Sheet name
       * @param {Object] option Initialization options of recordset (JSON)
       * @returns {Object} RecordSet
       */
       function createRecordSet (name, option) {

        if (typeof ActiveRecordService.recordsets === "undefined") {
          ActiveRecordService.recordsets = {};
        }
        if (typeof ActiveRecordService.recordsets[name] !== "undefined") {
          ActiveRecordService.recordsets[name] = new RecordSet(name, option);
        } else {
          if (typeof option !== "undefined" && compareObj(ActiveRecordService.recordsets[name].getOption(), option)) {
            ActiveRecordService.recordsets[name].setOption(option);
          }
        }
        return ActiveRecordService.recordsets[name];
      }
      ActiveRecordService.prototype.createRecordSet = createRecordSet;

      function compareObj(objA, objB) {
        var prop = "";
        var hasOwn = Object.prototype.hasOwnProperty;
        var objAKeys = Object.keys(objA);
        var objBKeys = Object.keys(objB);

        if (objAKeys.length !== objBKeys.length) {
          return false;
        }

        for (prop in objA) {
          if (hasOwn.call(objA,prop)) {
            if (objB[prop] !== objA[prop]) {
              return false;
            }
          }
        }
        return true;
      }

      function extendObj(objSrc,objDest){
        var prop = "";
        for (prop in objSrc) {
          objDest[prop] = objSrc[prop];
        }
        return objDest;
      }

    /**
     * RecordSet
     *
     * @constructor
     * @param {String} name  Sheet name
     * @param {Object} option  Intialization options of recordset (JSON)
     * @throws SheetNotFoundException
     */
     var RecordSet = function(name, option) {
        var defaultOption = {
          headerRowIndex: 1,
          headerColumnStartIndex: 1,
        },
        my = {},
        my.name = name,
        my.sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name)
          || throw new SheetNotFoundException("Sheet: " + name + "was not found.");

        my.option = Object.create(Object.prototype, (typeof option === "undefined" || Object.keys(option).length === 0)? defaultOption : option)

        // column setter
        my.column = {};
        my.inverseColumn = {};

        var headerRow = this.sheet.getRange(this.option.headerRowIndex,
          this.option.headerColumnStartIndex,
          1,
          this.sheet.getLastColumn()).getValues();

        for (var i = 0; i < headerRow[0].length; i++) {
          var that = this,
          columnName = headerRow[0][i],
          capitalizedColumnName = columnName.charAt(0).toUpperCase() + columnName.slice(1);
          this.column[columnName] = i + 1;
          this.inverseColumn[i] = columnName;
            // findByXXX methods
            RecordSet.prototype['findBy' + capitalizedColumnName] = function() {
              var newColumnName = columnName.slice(0);
              return function(data) {
                var whereParams = {};
                whereParams[newColumnName] = data;
                return that.where(whereParams);
              };
            }();
          }
        };
        RecordSet.prototype = {
        /**
         * Search recordset by ID
         * @methodOf  RecordSet
         * @param   {Integer} id  the value of the ID column for the line you want to search
         * @returns {Object} RecordSet
         */
         find: function(id) {
          return this.where({
            id: id
          });
        },
        /**
         * Count the number of rows in the specified recordset
         * @methodOf  RecordSet
         * @param   {Object}  option
         * @returns {Integer}
         */
         count: function(option) {
          var keys = Object.keys(option),
          hitRowIndexes = this.getRowIndices(keys[0], option[keys[0]]);
          return hitRowIndexes.length;
        },
        /**
         * @methodOf  RecordSet
         * @param     {Object}  option
         * @returns   {Array}   an object array of the specified row
         */
         where: function(option) {
          var result = [],
          keys = Object.keys(option),
          hitRowIndexes = this.getRowIndices(keys[0], option[keys[0]]);
          if (hitRowIndexes.length === 0) {
            return result;
          }
          for (var i = 0; i < hitRowIndexes.length; i++) {
            var tmpResult = {},
            rowValues = this.sheet.getRange(hitRowIndexes[i],
              this.option.headerColumnStartIndex,
              1,
              this.sheet.getLastColumn()).getValues();
            for (var j = 0; j < rowValues[0].length; j++) {
              tmpResult[this.inverseColumn[j]] = rowValues[0][j];
            }
            if (Object.keys(tmpResult).length !== 0) {
              result.push(tmpResult);
            }
          }
          return result;
        },
        getOption: function() {
          return this.option;
        },
        setOption: function(option) {
          this.option = option;
        },
        /**
         * Look for the line with the data corresponding to the column specified
         * @methodOf  RecordSet
         * @param {String} column  Column name
         * @param {String} data    Representing the filter field (JSON)
         */
         getRowIndices: function(column, data) {
          var hitRowIndexes = [],
          columnIndex = this.column[column],
          dataRowStartIndex = this.option.headerRowIndex + 1,
          columnValues = this.sheet.getRange(dataRowStartIndex,
            columnIndex,
            this.sheet.getLastRow()).getValues();
          for (var i = 0; i < columnValues.length; i++) {
            if (columnValues[i][0] === data) {
              hitRowIndexes.push(dataRowStartIndex + i);
            }
          }
          return hitRowIndexes;
        },
      };
    /**
     * Exception class to issue if the sheet that is specified in the method does not exist
     * @class SheetNotFoundException
     * @constructor
     * @param {String}  message
     */
     var SheetNotFoundException = function(message) {
        var my = Object.create(Error.prototype);
        my.message = message;
        my.name = "SheetNotFoundException";
        return my;
    };
    global.ActiveRecordService = ActiveRecordService;
  })(this);
