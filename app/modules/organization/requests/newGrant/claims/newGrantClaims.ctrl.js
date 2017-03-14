angular.module('organization')
.controller('newGrantClaimsCtrl', function(API,APIHelpers,DataStorage,Loader,NewGrant,$stateParams,$q,$scope,$state) {
    
    const newGrantClaims = this
    const loaderType = 'newGrantClaims.'
    newGrantClaims.prevStateParams={
        userId:$stateParams.userId
    }
    newGrantClaims.packageRequests = {}

    /* -------------------------------------------- ON LOAD START --------------------------------------------- */

    NewGrant.pullFromStorage(newGrantClaims,$stateParams.userId,'person');
    if (newGrantClaims.numberOfRequests===0) {
        $state.go('organization.requests.newGrantSearch',{userId:$stateParams.userId})
    }
    // get the claims for each app being requested
    Object.keys(newGrantClaims.appsBeingRequested).forEach((appId, i) => {
        const app = newGrantClaims.appsBeingRequested[appId]

        if (!newGrantClaims.packageRequests[app.servicePackage.id]) {
            newGrantClaims.packageRequests[app.servicePackage.id] = {
                claims: {},
                administratorRights: false
            }
        }

        Loader.onFor(loaderType + 'claims' + i)

        const opts = {
            qs: APIHelpers.getQs({
                packageId: newGrantClaims.appsBeingRequested[appId].servicePackage.id
            })
        }

        API.cui.getPackageClaims(opts)
        .then(res => {
            newGrantClaims['claims' + i] = Object.assign({}, res)
            res.forEach(claim => {
                newGrantClaims.packageRequests[app.servicePackage.id].claims[claim.claimId] = {}
            })
            Loader.offFor(loaderType + 'claims' + i)
            $scope.$digest()
        })
        .fail(err => { 
            // claims endpoint throws an error when the package has no claims
            newGrantClaims['claims' + i] = []
            Loader.offFor(loaderType + 'claims' + i)
            $scope.$digest()
        })
    })

    Loader.onFor(loaderType + 'user')
    API.cui.getPerson({ personId: $stateParams.userId })
    .then(res => {
        newGrantClaims.user = Object.assign({}, res)
        Loader.offFor(loaderType + 'user')
        $scope.$digest()
    })

    /* --------------------------------------------- ON LOAD END ---------------------------------------------- */

    /* --------------------------------------- ON CLICK FUNCTIONS START --------------------------------------- */

    newGrantClaims.submit = () => {
        Loader.onFor(loaderType + 'submit')
        let claimsPromises=[]
        // Grant Packages
        $q.all(NewGrant.packageGrants($stateParams.userId ,'person', newGrantClaims.packageRequests).map(opts => API.cui.grantPersonPackage(opts)))
        .then(res => {
            // grant claims
            let claimsData=NewGrant.claimGrants($stateParams.userId ,'person', newGrantClaims.packageRequests)
            claimsData.forEach(claimData => {
                if(claimData.data.packageClaims&&claimData.data.packageClaims.length!==0){
                    claimsPromises.push(API.cui.grantClaims(claimData))
                }
            })
            return $q.all(claimsPromises)
        })
        .then(res => {
            Loader.offFor(loaderType + 'submit')
            newGrantClaims.success = true
            DataStorage.setType('newGrant',{})
            $timeout(() => {
                $state.go('organization.directory.userList');
            }, 3000);
        })
        .catch(err => {
            Loader.offFor(loaderType + 'submit')
            newGrantClaims.error = true
        })
    }

    /* ---------------------------------------- ON CLICK FUNCTIONS END ---------------------------------------- */

})
