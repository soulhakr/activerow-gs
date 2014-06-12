/** AR.gs */
/**
 * https://github.com/soulhakr/activerow-gs
 */
(function(global) {
    /**
     * Holds functionality related to the ActiveRow
     * Use Cases:
     *   AR.createRecordSet('Sheet 1').where({name: 'nick'});
     *   // => returns [{id: 1, name: nick, email: 'nick@example.com'}]
     * @namespace AR
     */
    var AR = {
        /**
         * Returns specified google sheet name as an RecordSet object
         * @param {String} name   Sheet name
         * @param {Object] option Initialization options of recordset (JSON)
         * @returns {Object} RecordSet
         */
        createRecordSet: function(name, option) {
            if (typeof AR.recordsets === "undefined") {
                AR.recordsets = {};
            }
            if (!AR.recordsets[name]) {
                AR.recordsets[name] = new RecordSet(name, option);
            } else {
                if (typeof option !== "undefined") {
                    var eq = function(objA, objB) {
                        var objAKeys = Object.keys(objA);
                        var objBKeys = Object.keys(objB);
                        if (objAKeys.length !== objBKeys.length) {
                            return false;
                        }
                        for (var prop in objA) {
                            if (objA.hasOwnProperty(prop)) {
                                if (objB[prop] !== objA[prop]) {
                                    return false;
                                }
                            }
                        }
                        return true;
                    }(AR.recordsets[name].getOption(), option);
                    if (eq) {
                        AR.recordsets[name].setOption(option);
                    }
                }
            }
            return AR.recordsets[name];
        },
    };

    /**
     * RecordSet
     *
     * @constructor
     * @param {String} name  Sheet name
     * @param {Object} option  Intialization options of recordset (JSON)
     * @throws SheetNotFoundException
     */
    var RecordSet = function(name, option) {
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
            this.option = function(src, dest) { // extend option object
                for (var prop in src) {
                    dest[prop] = src[prop];
                }
                return dest;
            }(defaultOption, option);
        }
        // column setter
        this.column = {};
        this.inverseColumn = {};
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
        this.message = message;
        this.name = "SheetNotFoundException";
    };
    global.AR = AR;
})(this);
