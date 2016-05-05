angular.module('applications')
.factory('AppRequests',['$filter',($filter) => {
    var appRequestsObject={},
        appRequests={};

    appRequests.set=(newAppRequestsObject) => {
        appRequestsObject=newAppRequestsObject;
    };

    appRequests.get=() => {
        return appRequestsObject;
    };

    appRequests.clear= () => {
        appRequestsObject = {};
    };

    appRequests.buildReason=(app,reason) => {
        let tempApp={};
        angular.copy(app,tempApp);
        tempApp.reason=$filter('translate')('reason-im-requesting') + ' ' +  $filter('cuiI18n')(tempApp.name) + ': ' + reason;
        return tempApp;
    };


    appRequests.getPackageRequests=(userId,arrayOfAppsBeingRequested) => {
        let arrayOfPackagesBeingRequested=[],
            arrayOfPackageRequests=[];
        arrayOfAppsBeingRequested.forEach((app,i) => {
            if(arrayOfPackagesBeingRequested.indexOf(app.servicePackage.id)>-1){ // if we've parsed an app that belongs to the same pacakge
                arrayOfPackageRequests.some((packageRequest,i) => {
                    return arrayOfPackageRequests[i].servicePackage.id===app.servicePackage.id? (arrayOfPackageRequests[i].reason=arrayOfPackageRequests[i].reason + ('\n\n' + app.reason),true) : false; // if we already build a package request for this pacakge then append the reason of why we need this other app
                });
            }
            else {
                arrayOfPackageRequests[i]={
                    'requestor':{
                        id:userId,
                        type:'person'
                    },
                    servicePackage:{
                        id:app.servicePackage.id,
                        type: 'servicePackage'
                    },
                    reason: app.reason
                };
                arrayOfPackagesBeingRequested[i]=app.servicePackage.id; // save the pacakge id that we're requesting in a throwaway array, so it's easier to check if we're
                                                                // already requesting this package
            }
        });
        return arrayOfPackageRequests;
    };

    return appRequests;
}]);