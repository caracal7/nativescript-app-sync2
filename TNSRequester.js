"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@nativescript/core");
var packageJson = require("./package.json");
var TNSRequester = /** @class */ (function () {
    function TNSRequester() {
    }
    TNSRequester.prototype.request = function (verb, url, requestBody, callback) {
        if (typeof requestBody === "function") {
            callback = requestBody;
            requestBody = null;
        }
        if (requestBody && typeof requestBody === "object") {
            requestBody = JSON.stringify(requestBody);
        }
        core_1.Http.request({
            method: TNSRequester.getHttpMethodName(verb),
            url: url,
            content: requestBody,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-NativeScript-AppSync-Plugin-Name": packageJson.name,
                "X-NativeScript-AppSync-Plugin-Version": packageJson.version,
                "X-NativeScript-AppSync-SDK-Version": packageJson.dependencies["nativescript-app-sync-cli"]
            }
        }).then(function (response) {
            callback(null, {
                statusCode: response.statusCode,
                body: response.content ? response.content.toString() : null
            });
        });
    };
    TNSRequester.getHttpMethodName = function (verb) {
        // This should stay in sync with the enum at
        // https://github.com/Microsoft/code-push/blob/master/sdk/script/acquisition-sdk.ts#L6
        return [
            "GET",
            "HEAD",
            "POST",
            "PUT",
            "DELETE",
            "TRACE",
            "OPTIONS",
            "CONNECT",
            "PATCH"
        ][verb];
    };
    return TNSRequester;
}());
exports.TNSRequester = TNSRequester;
