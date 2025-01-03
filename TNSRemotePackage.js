"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@nativescript/core");
var TNSAcquisitionManager_1 = require("./TNSAcquisitionManager");
var TNSLocalPackage_1 = require("./TNSLocalPackage");
var TNSRemotePackage = /** @class */ (function () {
    function TNSRemotePackage() {
    }
    TNSRemotePackage.prototype.download = function (downloadSuccess, downloadError, downloadProgress) {
        var _this = this;
        var onDownloadSuccess = function (file) {
            var tnsLocalPackage = new TNSLocalPackage_1.TNSLocalPackage();
            tnsLocalPackage.localPath = file.path;
            tnsLocalPackage.deploymentKey = _this.deploymentKey;
            tnsLocalPackage.description = _this.description;
            tnsLocalPackage.label = _this.label;
            tnsLocalPackage.appVersion = _this.appVersion;
            tnsLocalPackage.isMandatory = _this.isMandatory;
            tnsLocalPackage.packageHash = _this.packageHash;
            tnsLocalPackage.isFirstRun = false;
            // TODO (low prio) for failedInstall, see https://github.com/Microsoft/cordova-plugin-code-push/blob/055d9e625d47d56e707d9624c9a14a37736516bb/www/remotePackage.ts#L55 (but prolly not too relevant)
            tnsLocalPackage.failedInstall = false;
            tnsLocalPackage.serverUrl = _this.serverUrl;
            downloadSuccess(tnsLocalPackage);
            new TNSAcquisitionManager_1.TNSAcquisitionManager(_this.deploymentKey, _this.serverUrl).reportStatusDownload(tnsLocalPackage);
        };
        // download, with a silly but effective retry mechanism
        core_1.Http.getFile(this.downloadUrl)
            .then(onDownloadSuccess)
            .catch(function () {
            setTimeout(function () {
                core_1.Http.getFile(_this.downloadUrl)
                    .then(onDownloadSuccess)
                    .catch(function () {
                    setTimeout(function () {
                        core_1.Http.getFile(_this.downloadUrl)
                            .then(onDownloadSuccess)
                            .catch(function (e) { return downloadError(new Error("Could not download remote package. " + e)); });
                    }, 3000);
                });
            }, 3000);
        });
    };
    TNSRemotePackage.prototype.abortDownload = function (abortSuccess, abortError) {
        // TODO (low prio)
    };
    return TNSRemotePackage;
}());
exports.TNSRemotePackage = TNSRemotePackage;
