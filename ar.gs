var ActiveRowService = ActiveRowService || (function(app,global) {

  var Table = function(sheet,name,option) {
    var myTable = {}, // public prototype
    schemaCols = [],
    columnName = "",
    newColumnName = "",
    defaultOpts = {
      headerRowIndex: 1,
      headerColumnStartIndex: 1
    };

    // column "function"
    myTable.column = [];

    // inverse column "function"
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

    // if sheet name not specified, throw exception
    if (typeof name !== "undefined") {
      myTable.name = name;
    } else {
      throw {
        name: "SheetNameUndefinedError",
        message: "Sheet name was not specified"
      };
    }

    // if sheet SpreadsheetApp returned null for that sheet name, throw exception
    if (sheet !== null) {
      myTable.sheet = sheet;
    } else {
      throw {
        name: "SheetNotFoundError",
        message: "Sheet: " + myTable.name + " was not found"
      };
    }

    schemaCols = sheet.getRange(option.headerRowIndex, option.headerColumnStartIndex, 1, sheet.getLastColumn()).getValues();

    // set initial options
    myTable.option = option;

    // add findByXXX methods
    for (index = schemaCols[0].length - 1; index >= 0; index -= 1) {
      columnName = schemaCols[0][index];
      capitalizedColumnName = columnName.charAt(0).toUpperCase() + columnName.slice(1);
      newColumnName = "findBy" + capitalizedColumnName;
      myTable.column[columnName] = index + 1;
      myTable.inverseColumn[index] = columnName;
      myTable[newColumnName] = function() {
        var methodName = columnName.slice(0);
        return function(data) {
          var whereParams = {};
          whereParams[methodName] = data;
          return myTable.where(whereParams);
        };
      }();
    }

    // public
    myTable.find = function (id) {
      return this.where({id: id});
    }

    myTable.count = function (option) {
      var keys = Object.keys(option),
      hitRowIndexes = this.getRowIndices(keys[0], option[keys[0]]);
      return hitRowIndexes.length;
    }

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

    myTable.getOption = function () {
      return this.option;
    }

    myTable.setOption = function (option) {
      this.option = option;
      return this;
    }

    myTable.getColumn = function (colName) {
      return this.column[colName]||-1;
    }

    myTable.getInverseColumn = function (index) {
      return (typeof index === "NaN" || typeof index === "undefined" || index === null || index < 1)? null:this.inverseColumn[index-1];
    }

    myTable.getRowIndices = function (column,data,range) {

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

  // private
  function hasSameKeys(objA, objB) {
    var objAKeys = Object.keys(objA);
    var objBKeys = Object.keys(objB);

    return (objAKeys.length === objBKeys.length && objAKeys.every( function(key) {
      return objBKeys.indexOf(key) !== -1;
    }));
  }

  return {
    // public
    getTable: function (sheet,name,option) {

      var cache = (typeof ActiveRowService.cache !== "undefined")? ActiveRowService.cache : [],
      t = cache[name] = (cache.indexOf(name) !== -1)? ((typeof option !== "undefined" && hasSameKeys(t.getOption(), option)) ? t.setOption(option):cache[name]): new Table(sheet,name,option);

      ActiveRowService.cache = cache;
      return t;
    }
  }
})(ActiveRowService,this);

ActiveRowService.namespace = function (ns) {
  var parts = ns.split('.'),
  parent = ActiveRowService,
  index = 0;

  // strip redundant leading global
  if (parts[0] === "ActiveRowService") {
    parts = parts.slice(1);
  }

  for (index = parts.length - 1; index >= 0; index -= 1) {
    // intialize property if the property doesn't already exist
    if (typeof parent[parts[index]] === "undefined"){
      parent[parts[i]] = {};
    }
    parent = parent[parts[index]];
  }
  return parent;
}
