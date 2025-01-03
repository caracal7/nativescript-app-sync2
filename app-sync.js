"use strict";
/// <reference path="./code-push-lib.d.ts"/>
Object.defineProperty(exports, "__esModule", { value: true });
var AppVersion = require("nativescript-appversion");
var core_1 = require("@nativescript/core");
var dialogs_1 = require("@nativescript/core/ui/dialogs");
var TNSAcquisitionManager_1 = require("./TNSAcquisitionManager");
var TNSLocalPackage_1 = require("./TNSLocalPackage");
var TNSRemotePackage_1 = require("./TNSRemotePackage");
var TNSLocalPackage_2 = require("./TNSLocalPackage");
exports.TNSLocalPackage = TNSLocalPackage_2.TNSLocalPackage;
var InstallMode;
(function (InstallMode) {
    /**
     * The update will be applied to the running application immediately. The application will be reloaded with the new content immediately.
     */
    InstallMode[InstallMode["IMMEDIATE"] = "IMMEDIATE"] = "IMMEDIATE";
    /**
     * The update is downloaded but not installed immediately. The new content will be available the next time the application is started.
     */
    InstallMode[InstallMode["ON_NEXT_RESTART"] = "ON_NEXT_RESTART"] = "ON_NEXT_RESTART";
    /**
     * The update is downloaded but not installed immediately. The new content will be available the next time the application is resumed or restarted, whichever event happends first.
     */
    InstallMode[InstallMode["ON_NEXT_RESUME"] = "ON_NEXT_RESUME"] = "ON_NEXT_RESUME";
})(InstallMode = exports.InstallMode || (exports.InstallMode = {}));
var SyncStatus;
(function (SyncStatus) {
    /**
     * The application is up to date.
     */
    SyncStatus[SyncStatus["UP_TO_DATE"] = "UP_TO_DATE"] = "UP_TO_DATE";
    /**
     * An update is available, it has been downloaded, unzipped and copied to the deployment folder.
     * After the completion of the callback invoked with SyncStatus.UPDATE_INSTALLED, the application will be reloaded with the updated code and resources.
     */
    SyncStatus[SyncStatus["UPDATE_INSTALLED"] = "UPDATE_INSTALLED"] = "UPDATE_INSTALLED";
    /**
     * An optional update is available, but the user declined to install it. The update was not downloaded.
     */
    SyncStatus[SyncStatus["UPDATE_IGNORED"] = "UPDATE_IGNORED"] = "UPDATE_IGNORED";
    /**
     * An error happened during the sync operation. This might be an error while communicating with the server, downloading or unziping the update.
     * The console logs should contain more information about what happened. No update has been applied in this case.
     */
    SyncStatus[SyncStatus["ERROR"] = "ERROR"] = "ERROR";
    /**
     * Returned if HMR is enabled and not overridden by the user.
     */
    SyncStatus[SyncStatus["SKIPPING_BECAUSE_HMR_ENABLED"] = "SKIPPING_BECAUSE_HMR_ENABLED"] = "SKIPPING_BECAUSE_HMR_ENABLED";
    /**
     * There is an ongoing sync in progress, so this attempt to sync has been aborted.
     */
    SyncStatus[SyncStatus["IN_PROGRESS"] = "IN_PROGRESS"] = "IN_PROGRESS";
    /**
     * Intermediate status - the plugin is about to check for updates.
     */
    SyncStatus[SyncStatus["CHECKING_FOR_UPDATE"] = "CHECKING_FOR_UPDATE"] = "CHECKING_FOR_UPDATE";
    /**
     * Intermediate status - a user dialog is about to be displayed. This status will be reported only if user interaction is enabled.
     */
    SyncStatus[SyncStatus["AWAITING_USER_ACTION"] = "AWAITING_USER_ACTION"] = "AWAITING_USER_ACTION";
    /**
     * Intermediate status - the update package is about to be downloaded.
     */
    SyncStatus[SyncStatus["DOWNLOADING_PACKAGE"] = "DOWNLOADING_PACKAGE"] = "DOWNLOADING_PACKAGE";
    /**
     * Intermediate status - the update package is about to be installed.
     */
    SyncStatus[SyncStatus["INSTALLING_UPDATE"] = "INSTALLING_UPDATE"] = "INSTALLING_UPDATE";
})(SyncStatus = exports.SyncStatus || (exports.SyncStatus = {}));
var AppSync = /** @class */ (function () {
    function AppSync() {
    }
    AppSync.sync = function (options, syncCallback, downloadProgress) {

        console.log('AppSync.sync call 🔥');

        var _this = this;
        if (!options || !options.deploymentKey) {
            throw new Error("Missing deploymentKey, pass it as part of the first parameter of the 'sync' function: { deploymentKey: 'your-key' }");
        }
        // skip AppSync when HMR is detected, unless it's explicitly allowed
        // @ts-ignore
        if (Boolean(module.hot) && !options.enabledWhenUsingHmr) {
            syncCallback && syncCallback(SyncStatus.SKIPPING_BECAUSE_HMR_ENABLED);
            return;
        }
        AppSync.syncInProgress = true;
        // by default, use our Cloud server
        options.serverUrl = options.serverUrl || "https://appsync-server.nativescript.org/";
        AppSync.cleanPackagesIfNeeded();
        AppSync.notifyApplicationReady(options.deploymentKey, options.serverUrl);
        syncCallback && syncCallback(SyncStatus.CHECKING_FOR_UPDATE);
        AppSync.checkForUpdate(options.deploymentKey, options.serverUrl).then(function (remotePackage) {
            if (!remotePackage) {
                syncCallback && syncCallback(SyncStatus.UP_TO_DATE);
                AppSync.syncInProgress = false;
                return;
            }

            if (options.ignoreFailedUpdates === undefined) {
                options.ignoreFailedUpdates = true;
            }
            var updateShouldBeIgnored = remotePackage.failedInstall && options.ignoreFailedUpdates;
            if (updateShouldBeIgnored) {
                console.log("An update is available, but it is being ignored due to having been previously rolled back.");
                syncCallback && syncCallback(SyncStatus.UP_TO_DATE);
                AppSync.syncInProgress = false;
                return;
            }
            var onError = function (error) {
                console.log("Download error: " + error);
                syncCallback && syncCallback(SyncStatus.ERROR);
                AppSync.syncInProgress = false;
            };
            var onInstallSuccess = function () {
                core_1.ApplicationSettings.setString(AppSync.PENDING_HASH_KEY, remotePackage.packageHash);
                core_1.ApplicationSettings.setString(AppSync.CURRENT_HASH_KEY, remotePackage.packageHash);
                var onSuspend = function () {
                    core_1.Application.off("suspend", onSuspend);
                    _this.killApp(false);
                };
                syncCallback && syncCallback(SyncStatus.UPDATE_INSTALLED, remotePackage.label);
                var installMode = options.installMode || InstallMode.ON_NEXT_RESTART;
                var mandatoryInstallMode = options.mandatoryInstallMode || InstallMode.ON_NEXT_RESUME;

                switch (remotePackage.isMandatory ? mandatoryInstallMode : installMode) {
                    case InstallMode.ON_NEXT_RESTART:
                        console.log("Update is installed and will be run on the next app restart.");
                        break;
                    case InstallMode.ON_NEXT_RESUME:
                        console.log("Update is installed and will be run when the app next resumes.");
                        core_1.Application.on("suspend", onSuspend);
                        break;
                    case InstallMode.IMMEDIATE:
                        var updateDialogOptions = (options.updateDialog || {});
                        dialogs_1.confirm({
                            title: updateDialogOptions.updateTitle,
                            message: (remotePackage.isMandatory ? updateDialogOptions.mandatoryUpdateMessage : updateDialogOptions.optionalUpdateMessage) + (updateDialogOptions.appendReleaseDescription ? "\n" + remotePackage.description : ""),
                            okButtonText: updateDialogOptions.mandatoryContinueButtonLabel || "Restart",
                            cancelButtonText: updateDialogOptions.optionalIgnoreButtonLabel || "Cancel",
                            cancelable: true
                        }).then(function (confirmed) {
                            if (confirmed) {
                                setTimeout(function () { return _this.killApp(true); }, 300);
                            }
                            else {
                                // fall back to next suspend/resume instead
                                core_1.Application.on("suspend", onSuspend);
                            }
                        });
                        break;
                }
                AppSync.syncInProgress = false;
            };
            var onDownloadSuccess = function (localPackage) {
                syncCallback && syncCallback(SyncStatus.INSTALLING_UPDATE, remotePackage.label);
                localPackage.install(onInstallSuccess, onError);
            };
            syncCallback && syncCallback(SyncStatus.DOWNLOADING_PACKAGE, remotePackage.label);
            remotePackage.download(onDownloadSuccess, onError, downloadProgress);
        }, function (error) {
            console.log(error);
            AppSync.syncInProgress = false;
            if (syncCallback) {
                syncCallback(SyncStatus.ERROR);
            }
        });
    };
    AppSync.checkForUpdate = function (deploymentKey, serverUrl) {
        return new Promise(function (resolve, reject) {
            // by default, use our Cloud server
            serverUrl = serverUrl || "https://appsync-server.nativescript.org/";
            var config = {
                serverUrl: serverUrl,
                appVersion: AppVersion.getVersionNameSync(),
                clientUniqueId: core_1.Device.uuid,
                deploymentKey: deploymentKey
            };
            AppSync.getCurrentPackage(config)
                .then(function (queryPackage) {
                new TNSAcquisitionManager_1.TNSAcquisitionManager(deploymentKey, serverUrl).queryUpdateWithCurrentPackage(queryPackage, function (error, result) {
                    if (error) {
                        reject(error.message || error.toString());
                    }
                    if (!result || result.updateAppVersion) {
                        resolve();
                        return;
                    }
                    // At this point we know there's an update available for the current version
                    var remotePackage = result;
                    var tnsRemotePackage = new TNSRemotePackage_1.TNSRemotePackage();
                    tnsRemotePackage.description = remotePackage.description;
                    tnsRemotePackage.label = remotePackage.label;
                    tnsRemotePackage.appVersion = remotePackage.appVersion;
                    tnsRemotePackage.isMandatory = remotePackage.isMandatory;
                    tnsRemotePackage.packageHash = remotePackage.packageHash;
                    tnsRemotePackage.packageSize = remotePackage.packageSize;
                    tnsRemotePackage.downloadUrl = remotePackage.downloadUrl;
                    // the server doesn't send back the deploymentKey
                    tnsRemotePackage.deploymentKey = config.deploymentKey;
                    // TODO (low prio) see https://github.com/Microsoft/cordova-plugin-code-push/blob/055d9e625d47d56e707d9624c9a14a37736516bb/www/codePush.ts#L182
                    // .. or https://github.com/Microsoft/react-native-code-push/blob/2cd2ef0ca2e27a95f84579603c2d222188bb9ce5/CodePush.js#L84
                    tnsRemotePackage.failedInstall = false;
                    tnsRemotePackage.serverUrl = serverUrl;
                    resolve(tnsRemotePackage);
                });
            })
                .catch(function (e) { return reject(e); });
        });
    };
    AppSync.getCurrentPackage = function (config) {
        return new Promise(function (resolve, reject) {
            resolve({
                appVersion: config.appVersion,
                deploymentKey: config.deploymentKey,
                packageHash: core_1.ApplicationSettings.getString(AppSync.CURRENT_HASH_KEY),
                isMandatory: false,
                failedInstall: false,
                description: undefined,
                label: undefined,
                packageSize: undefined,
                serverUrl: config.serverUrl
            });
        });
    };
    AppSync.notifyApplicationReady = function (deploymentKey, serverUrl) {
        if (AppSync.isBinaryFirstRun()) {
            // first run of a binary from the AppStore
            AppSync.markBinaryAsFirstRun();
            new TNSAcquisitionManager_1.TNSAcquisitionManager(deploymentKey, serverUrl).reportStatusDeploy(null, "DeploymentSucceeded");
        }
        else if (!AppSync.hasPendingHash()) {
            var currentPackageHash = core_1.ApplicationSettings.getString(AppSync.CURRENT_HASH_KEY, null);
            if (currentPackageHash !== null && currentPackageHash !== AppSync.firstLaunchValue()) {
                // first run of an update from AppSync
                AppSync.markPackageAsFirstRun(currentPackageHash);
                var currentPackage = TNSLocalPackage_1.TNSLocalPackage.getCurrentPackage();
                if (currentPackage !== null) {
                    currentPackage.isFirstRun = true;
                    new TNSAcquisitionManager_1.TNSAcquisitionManager(deploymentKey, serverUrl).reportStatusDeploy(currentPackage, "DeploymentSucceeded");
                }
            }
        }
    };
    AppSync.killApp = function (restartOnAndroid) {
        if (core_1.Application.android) {
            if (restartOnAndroid) {
                var packageManager = core_1.Application.android.context.getPackageManager();
                var intent = packageManager.getLaunchIntentForPackage(core_1.Application.android.context.getPackageName());
                var componentName = intent.getComponent();
                //noinspection JSUnresolvedFunction,JSUnresolvedVariable
                var mainIntent = new android.content.Intent.makeRestartActivityTask(componentName);
                core_1.Application.android.context.startActivity(mainIntent);
                //noinspection JSUnresolvedFunction,JSUnresolvedVariable
            }
            //noinspection JSUnresolvedFunction,JSUnresolvedVariable
            android.os.Process.killProcess(android.os.Process.myPid());
        }
        else if (core_1.Application.ios) {
            exit(0);
        }
    };
    AppSync.cleanPackagesIfNeeded = function () {
        var shouldClean = core_1.ApplicationSettings.getBoolean(AppSync.CLEAN_KEY, false);
        if (!shouldClean) {
            return;
        }
        core_1.ApplicationSettings.remove(AppSync.CLEAN_KEY);
        core_1.ApplicationSettings.remove(AppSync.BINARY_FIRST_RUN_KEY);
        TNSLocalPackage_1.TNSLocalPackage.clean();
    };
    AppSync.isBinaryFirstRun = function () {
        var firstRunFlagSet = core_1.ApplicationSettings.getBoolean(AppSync.BINARY_FIRST_RUN_KEY, false);
        return !firstRunFlagSet;
    };
    /**
     * This key exists until a restart is done (removed by native upon start).
     * @returns {boolean}
     */
    AppSync.hasPendingHash = function () {
        return core_1.ApplicationSettings.hasKey(AppSync.PENDING_HASH_KEY);
    };
    AppSync.markBinaryAsFirstRun = function () {
        core_1.ApplicationSettings.setBoolean(AppSync.BINARY_FIRST_RUN_KEY, true);
    };
    AppSync.firstLaunchValue = function () {
        return core_1.ApplicationSettings.getString(AppSync.UNCONFIRMED_INSTALL_KEY, null);
    };
    AppSync.markPackageAsFirstRun = function (pack) {
        core_1.ApplicationSettings.setString(AppSync.UNCONFIRMED_INSTALL_KEY, pack);
    };
    AppSync.CURRENT_HASH_KEY = "APPSYNC_CURRENT_HASH"; // same as native
    AppSync.PENDING_HASH_KEY = "APPSYNC_PENDING_HASH"; // same as native
    AppSync.CLEAN_KEY = "APPSYNC_CLEAN"; // same as native (Android)
    AppSync.BINARY_FIRST_RUN_KEY = "BINARY_FIRST_RUN";
    AppSync.UNCONFIRMED_INSTALL_KEY = "UNCONFIRMED_INSTALL";
    AppSync.syncInProgress = false;
    return AppSync;
}());
exports.AppSync = AppSync;
