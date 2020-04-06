"use strict";
/*******************/
/*      Round      */
/*******************/
Object.defineProperty(exports, "__esModule", { value: true });
exports.toDecimalPlaces = (decimals) => (value) => {
    return parseFloat(value.toFixed(decimals));
};
exports.to2DecimalPlaces = exports.toDecimalPlaces(2);
exports.toInteger = exports.toDecimalPlaces(0);
