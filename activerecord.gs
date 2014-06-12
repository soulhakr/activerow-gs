/** activerecord.gs */
/**
 * https://github.com/soulhakr/activerecord-gs
 */
(function(global) {
    /**
     * ActiveRow  Underlying objects to use
     *
     * Use Cases:
     *   ActiveRecord.createRecordSet('Sheet 1').where({name: 'nick'}); // => returns [{id: 1, name: nick, email: 'nick@example.com'}]
     *
     */
    var ActiveRecord = {
        /**
         * returns specified google sheet name as an ActiveRecordSet object
         * @param {String} name   Sheet name
         * @param {Object] option Initialization options of recordset
         */
        createRecordSet: function(name, option) {
            if (typeof ActiveRecord.recordsets === "undefined") {
                ActiveRecord.recordsets = {};
            }
            if (!ActiveRecord.recordsets[name]) {
                ActiveRecord.recordsets[name] = new ActiveRecordSet(name, option);
            } else {
                if (typeof option !== "undefined" && !Util.isEqual(AR.recordsets[name].getOption(), option)) {
                    ActiveRecord.recordsets[name].setOption(option);
                }
            }
            return ActiveRecord.recordsets[name];
        },
    };
    /**
     * Class regarded as the table each sheet
     * @constructor
     */
    var ActiveRecordSet = function(name, option) {
        this.name = name;
        this.sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
        if (this.sheet === null) {
            throw new SheetNotFoundException("Sheet: " + name + "was not found.");
        }
        var defaultOption = {
            headerRowIndex: 1,
            headerColumnStartIndex: 1,
        };
        if (typeof option === "undefined" || Object.keys(option).length === 0) {
            this.option = defaultOption;
        } else {
            this.option = Util.extend(defaultOption, option);
        }
        // column setter
        this.column = {};
        this.inverseColumn = {};
        var headerRow = this.sheet.getRange(this.option.headerRowIndex, this.option.headerColumnStartIndex, 1, this.sheet.getLastColumn()).getValues();
        for (var i = 0; i < headerRow[0].length; i++) {
            var that = this,
                columnName = headerRow[0][i],
                capitalizedColumnName = columnName.charAt(0).toUpperCase() + columnName.slice(1);
            this.column[columnName] = i + 1;
            this.inverseColumn[i] = columnName;
            //findByXXX methods
            ActiveRecordSet.prototype['findBy' + capitalizedColumnName] = function() {
                var newColumnName = columnName.slice(0);
                return function(data) {
                    var whereParams = {};
                    whereParams[newColumnName] = data;
                    return that.where(whereParams);
                };
            }();
        }
    };
    ActiveRecordSet.prototype = {
        /**
         * ID to search for in the database
         * @param {Integer} id  the value of the ID column for the line you want to search
         */
        find: function(id) {
            return this.where({
                id: id
            });
        },
        /**
         * option Count the number of rows in the specified
         * @param {Object} option
         */
        count: function(option) {
            var keys = Object.keys(option),
                hitRowIndexes = this._seekRows(keys[0], option[keys[0]]);
            return hitRowIndexes.length;
        },
        /**
         * option Return an object array of the specified row
         * @param {Object} option
         */
        where: function(option) {
            var keys = Object.keys(option),
                hitRowIndexes = this._seekRows(keys[0], option[keys[0]]);
            if (hitRowIndexes.length === 0) {
                return [];
            }
            return this._createTableObjects(hitRowIndexes);
        },
        getOption: function() {
            return this.option;
        },
        setOption: function(option) {
            this.option = option;
        },
        /**
         * look for the line with the data corresponding to the column specified
         * @param {String} column Column name
         * @param {String} data
         */
        _seekRows: function(column, data) {
            var hitRowIndexes = [],
                columnIndex = this.column[column],
                dataRowStartIndex = this.option.headerRowIndex + 1,
                columnValues = this.sheet.getRange(dataRowStartIndex, columnIndex, this.sheet.getLastRow()).getValues();
            for (var i = 0; i < columnValues.length; i++) {
                if (columnValues[i][0] === data) {
                    hitRowIndexes.push(dataRowStartIndex + i);
                }
            }
            return hitRowIndexes;
        },
        /**
         * Returns an object array by adding the key to the data of the row that was hit
         * @param {Array} hitRowIndexes Group ID of the row that was hit
         */
        _createTableObjects: function(hitRowIndexes) {
            var result = [];
            for (var i = 0; i < hitRowIndexes.length; i++) {
                var tmpResult = {},
                    rowValues = this.sheet.getRange(hitRowIndexes[i], this.option.headerColumnStartIndex, 1, this.sheet.getLastColumn()).getValues();
                for (var j = 0; j < rowValues[0].length; j++) {
                    tmpResult[this.inverseColumn[j]] = rowValues[0][j];
                }
                if (Object.keys(tmpResult).length !== 0) {
                    result.push(tmpResult);
                }
            }
            return result;
        },
    };
    var Util = {
        extend: function(dest, source) {
            for (var property in source) {
                dest[property] = source[property];
            }
            return dest;
        },
        isEqual: function(objA, objB) {
            var objAKeys = Object.keys(objA);
            var objBKeys = Object.keys(objB);
            if (objAKeys.length !== objBKeys.length) {
                return false;
            }
            for (var i = 0; i < objAKeys.length; i++) {
                if (objA[objAKeys[i]] !== objB[objAKeys[i]]) {
                    return false;
                }
            }
            return true;
        },
    };
    /**
     * AR.t Exception class to issue if the sheet that is specified in the method does not exist
     * @constructor
     */
    var SheetNotFoundException = function(message) {
        this.message = message;
        this.name = "SheetNotFoundException";
    };
    global.ActiveRecord = ActiveRecord;
})(this);
