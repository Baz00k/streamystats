"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrate = exports.closeConnection = exports.database = exports.db = void 0;
// Export the database connection
var connection_1 = require("./connection");
Object.defineProperty(exports, "db", { enumerable: true, get: function () { return connection_1.db; } });
Object.defineProperty(exports, "database", { enumerable: true, get: function () { return __importDefault(connection_1).default; } });
Object.defineProperty(exports, "closeConnection", { enumerable: true, get: function () { return connection_1.closeConnection; } });
// Export all schema tables and types
__exportStar(require("./schema"), exports);
// Export migration utilities
var migrate_1 = require("./migrate");
Object.defineProperty(exports, "migrate", { enumerable: true, get: function () { return migrate_1.migrate; } });
//# sourceMappingURL=index.js.map