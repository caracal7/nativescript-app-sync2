"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var nativescript_zip_1 = require("@nativescript/zip");
var core_1 = require("@nativescript/core");
var file_system_access_1 = require("@nativescript/core/file-system/file-system-access");
var app_sync_1 = require("./app-sync");
var TNSAcquisitionManager_1 = require("./TNSAcquisitionManager");
var TNSLocalPackage = /** @class */ (function () {
    function TNSLocalPackage() {
    }
    TNSLocalPackage.prototype.install = function (installSuccess, errorCallback, installOptions) {
        var _this = this;
        var appFolderPath = core_1.knownFolders.documents().path + "/app";
        var unzipFolderPath = core_1.knownFolders.documents().path + "/AppSync-Unzipped/" + this.packageHash;
        var appSyncFolder = core_1.knownFolders.documents().path + "/AppSync";
        // make sure the AppSync folder exists
        core_1.Folder.fromPath(appSyncFolder);
        var newPackageFolderPath = core_1.knownFolders.documents().path + "/AppSync/" + this.packageHash;
        // in case of a rollback make 'newPackageFolderPath' could already exist, so check and remove
        if (core_1.Folder.exists(newPackageFolderPath)) {
            core_1.Folder.fromPath(newPackageFolderPath).removeSync();
        }
        var onUnzipComplete = function (success, error) {
            if (!success) {
                new TNSAcquisitionManager_1.TNSAcquisitionManager(_this.deploymentKey, _this.serverUrl).reportStatusDeploy(_this, "DeploymentFailed");
                errorCallback && errorCallback(new Error(error));
                return;
            }
            var previousHash = core_1.ApplicationSettings.getString(app_sync_1.AppSync.CURRENT_HASH_KEY, null);
            var isDiffPackage = core_1.File.exists(unzipFolderPath + "/hotappsync.json");
            if (isDiffPackage) {
                var copySourceFolder = previousHash === null ? appFolderPath : core_1.knownFolders.documents().path + "/AppSync/" + previousHash;
                if (!TNSLocalPackage.copyFolder(copySourceFolder, newPackageFolderPath)) {
                    errorCallback && errorCallback(new Error("Failed to copy " + copySourceFolder + " to " + newPackageFolderPath));
                    return;
                }
                if (!TNSLocalPackage.copyFolder(unzipFolderPath, newPackageFolderPath)) {
                    errorCallback && errorCallback(new Error("Failed to copy " + unzipFolderPath + " to " + newPackageFolderPath));
                    return;
                }
            }
            else {
                new file_system_access_1.FileSystemAccess().rename(unzipFolderPath, newPackageFolderPath, function (error) {
                    errorCallback && errorCallback(new Error(error));
                    return;
                });
            }
            if (!core_1.isIOS) {
                var pendingFolderPath = core_1.knownFolders.documents().path + "/AppSync/pending";
                if (core_1.Folder.exists(pendingFolderPath)) {
                    core_1.Folder.fromPath(pendingFolderPath).removeSync();
                }
                if (!TNSLocalPackage.copyFolder(newPackageFolderPath, pendingFolderPath)) {
                    errorCallback && errorCallback(new Error("Failed to copy " + newPackageFolderPath + " to " + pendingFolderPath));
                    return;
                }
            }
            core_1.ApplicationSettings.setString(TNSLocalPackage.APPSYNC_CURRENT_APPVERSION, _this.appVersion);
            TNSLocalPackage.saveCurrentPackage(_this);
            var buildTime;
            // Note that this 'if' hardly justifies subclassing so we're not
            if (core_1.isIOS) {
                var plist = NSBundle.mainBundle.pathForResourceOfType(null, "plist");
                var fileDate = new file_system_access_1.FileSystemAccess().getLastModified(plist);
                buildTime = "" + fileDate.getTime();
            }
            else {
                var appSyncApkBuildTimeStringId = core_1.Utils.android.resources.getStringId(TNSLocalPackage.APPSYNC_APK_BUILD_TIME);
                buildTime = core_1.Utils.android.getApplicationContext().getResources().getString(appSyncApkBuildTimeStringId);
            }
            core_1.ApplicationSettings.setString(TNSLocalPackage.APPSYNC_CURRENT_APPBUILDTIME, buildTime);
            //noinspection JSIgnoredPromiseFromCall (removal is async, don't really care if it fails)
            core_1.File.fromPath(_this.localPath).remove();
            installSuccess();
        };
        TNSLocalPackage.unzip(this.localPath, unzipFolderPath,
        // TODO expose through plugin API (not that it's super useful)
        function (percent) {
            // console.log("AppSync package unzip progress: " + percent);
        }, onUnzipComplete);
    };
    TNSLocalPackage.unzip = function (archive, destination, progressCallback, completionCallback) {
        if (core_1.isIOS) {
            TNSAppSync.unzipFileAtPathToDestinationOnProgressOnComplete(archive, destination, function (itemNr, totalNr) {
                progressCallback(Math.floor((itemNr / totalNr) * 100));
            }, function (path, success, error) {
                completionCallback(success, error ? error.localizedDescription : null);
            });
        }
        else {
            nativescript_zip_1.Zip.unzip({
                archive: archive,
                directory: destination,
                onProgress: progressCallback
            }).then(function () {
                completionCallback(true);
            }, function (error) {
                completionCallback(false, error);
            });
        }
    };
    TNSLocalPackage.clean = function () {
        // note that we mustn't call this on Android, but it can't hurt to guard that
        if (!core_1.isIOS) {
            return;
        }
        core_1.ApplicationSettings.remove(TNSLocalPackage.APPSYNC_CURRENT_APPVERSION);
        core_1.ApplicationSettings.remove(TNSLocalPackage.APPSYNC_CURRENT_APPBUILDTIME);
        var appSyncFolder = core_1.Folder.fromPath(core_1.knownFolders.documents().path + "/AppSync");
        //noinspection JSIgnoredPromiseFromCall
        appSyncFolder.clear();
    };
    TNSLocalPackage.saveCurrentPackage = function (pack) {
        core_1.ApplicationSettings.setString(TNSLocalPackage.APPSYNC_CURRENT_PACKAGE, JSON.stringify(pack));
    };
    TNSLocalPackage.getCurrentPackage = function () {
        var packageStr = core_1.ApplicationSettings.getString(TNSLocalPackage.APPSYNC_CURRENT_PACKAGE, null);
        return packageStr === null ? null : JSON.parse(packageStr);
    };
    TNSLocalPackage.copyFolder = function (fromPath, toPath) {
        if (core_1.isIOS) {
            return TNSAppSync.copyEntriesInFolderDestFolderError(fromPath, toPath);
        }
        else {
            try {
                com.tns.TNSAppSync.copyDirectoryContents(fromPath, toPath);
                return true;
            }
            catch (error) {
                console.log("Copy error on Android: " + error);
                return false;
            }
        }
    };
    // this is the app version at the moment the AppSync package was installed
    TNSLocalPackage.APPSYNC_CURRENT_APPVERSION = "APPSYNC_CURRENT_APPVERSION"; // same as native
    TNSLocalPackage.APPSYNC_CURRENT_PACKAGE = "APPSYNC_CURRENT_PACKAGE";
    // this is the build timestamp of the app at the moment the AppSync package was installed
    TNSLocalPackage.APPSYNC_CURRENT_APPBUILDTIME = "APPSYNC_CURRENT_APPBUILDTIME"; // same as native
    TNSLocalPackage.APPSYNC_APK_BUILD_TIME = "APPSYNC_APK_BUILD_TIME"; // same as include.gradle
    return TNSLocalPackage;
}());
exports.TNSLocalPackage = TNSLocalPackage;
