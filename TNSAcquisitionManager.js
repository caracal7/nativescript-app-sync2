"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var AppVersion = require("nativescript-appversion");
var acquisition_sdk_1 = require("nativescript-app-sync-sdk/script/acquisition-sdk");
var core_1 = require("@nativescript/core");
var TNSRequester_1 = require("./TNSRequester");
var TNSAcquisitionManager = /** @class */ (function () {
    function TNSAcquisitionManager(deploymentKey, serverUrl) {
        var config = {
            serverUrl: serverUrl,
            appVersion: AppVersion.getVersionNameSync(),
            clientUniqueId: core_1.Device.uuid,
            deploymentKey: deploymentKey
        };
        this.appSyncSDK = new acquisition_sdk_1.AcquisitionManager(new TNSRequester_1.TNSRequester(), config);
        return this;
    }
    TNSAcquisitionManager.prototype.queryUpdateWithCurrentPackage = function (currentPackage, callback) {
        this.appSyncSDK.queryUpdateWithCurrentPackage(currentPackage, callback);
    };
    TNSAcquisitionManager.prototype.reportStatusDeploy = function (pkg, status, previousLabelOrAppVersion, previousDeploymentKey) {
        this.appSyncSDK.reportStatusDeploy(pkg, status, previousLabelOrAppVersion, previousDeploymentKey, function () {
            // console.log("---- reportStatusDeploy completed, status: " + status);
            // console.log("---- reportStatusDeploy completed, pkg: " + JSON.stringify(pkg));
        });
    };
    TNSAcquisitionManager.prototype.reportStatusDownload = function (pkg) {
        this.appSyncSDK.reportStatusDownload(pkg, function () {
            // console.log("---- reportStatusDownload completed");
        });
    };
    return TNSAcquisitionManager;
}());
exports.TNSAcquisitionManager = TNSAcquisitionManager;
