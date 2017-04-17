angular.module('organization')
.controller('orgAppSearchCtrl',function(API,DataStorage,Loader,User,$pagination,$q,$state,$stateParams) {

    const orgAppSearch = this;
    const loaderName = 'orgAppSearch.loading';
    orgAppSearch.stateParamsOrgId=$stateParams.orgId;

    orgAppSearch.packageRequests = DataStorage.getType('orgAppsBeingRequested', User.user.id) || {};
    orgAppSearch.appCheckbox = {};

    /* ---------------------------------------- HELPER FUNCTIONS START ---------------------------------------- */

    const processNumberOfRequestedApps = (pkgRequest) => {
        if (pkgRequest) orgAppSearch.numberOfRequests++;
        else orgAppSearch.numberOfRequests--;
    };

    const updateViewList = (list) => {
        let deferred= $q.defer()
        orgAppSearch.viewList=[]
        let qs=[]
        let apiPromises = []
        angular.forEach(list, (app,parentIndex) => {
            // Child App and Parent app requested by user
            if(app.servicePackage.parent&&app.relatedApps){
                let flag=false
                angular.forEach(app.relatedApps, (realtedApp,index) => {
                    if (_.find(list,{id:realtedApp.id})) {
                        flag=true
                    }
                    else{
                        qs.push(['service.id',realtedApp.id])
                    }
                    if (index===app.relatedApps.length-1&&qs.length!==0) {
                        apiPromises.push(API.cui.getOrganizationsRequestableApps({organizationId: User.user.organization.id,qs:qs}))
                        qs=[]
                    }
                })
            }
            else{
                orgAppSearch.viewList.push(app)
            }
        })
        $q.all(apiPromises)
        .then(res => {
            angular.forEach(res, (app) => {
                if (orgAppSearch.search.name) {
                    app[0].expanded=true
                }
                orgAppSearch.viewList.push(...app)
                orgAppSearch.list.push(...app)
            })
            deferred.resolve()
        })
        .catch(err =>{
            console.log("There was an error loading parent requestable apps")
                deferred.reject(err)
        })
        return deferred.promise
    }
    /* ----------------------------------------- HELPER FUNCTIONS END ----------------------------------------- */

    /* -------------------------------------------- ON LOAD START --------------------------------------------- */

    const onLoad = (previouslyLoaded) => {
        if (previouslyLoaded) {
            Loader.onFor(loaderName);
        }
        else { 
            Loader.onFor(loaderName);
            // pre populate fields based on state params on first load
            let numberOfRequests = 0;

            Object.keys(orgAppSearch.packageRequests).forEach(function(appId) { 
                // Gets the list of package requests saved in memory
                // This sets the checkboxes back to marked when the user clicks back after being in request review
                orgAppSearch.appCheckbox[appId] = true;
                numberOfRequests++;
            });
            
            orgAppSearch.numberOfRequests = numberOfRequests;

            orgAppSearch.search = {};
            orgAppSearch.search.name = $stateParams.name;
            orgAppSearch.search.category = $stateParams.category;
            orgAppSearch.search.page = parseInt($stateParams.page);
            orgAppSearch.search.pageSize = parseInt($stateParams.pageSize);
        }

        let query = [];

        if (orgAppSearch.search.name) query.push(['service.name',orgAppSearch.search.name]);
        if (orgAppSearch.search.category) query.push(['service.category',orgAppSearch.search.category]);

        orgAppSearch.search.pageSize = orgAppSearch.search.pageSize || $pagination.getUserValue() || $pagination.getPaginationOptions()[0] || 25;
        query.push(['pageSize',String(orgAppSearch.search.pageSize)]);

        orgAppSearch.search.page = orgAppSearch.search.page || 1;
        query.push(['page',String(orgAppSearch.search.page)]);

        let opts = {
            organizationId: User.user.organization.id,
            useCuid:true,
            qs: query
        };
        
        const promises = [API.cui.getOrganizationsRequestableApps(opts), API.cui.getOrganizationRequestableCount(opts)];

        $q.all(promises)
        .then((res) => {
             orgAppSearch.list = res[0];
             orgAppSearch.count = res[1];
             updateViewList(res[0])
             .then(() =>{
                Loader.offFor(loaderName);
             })
             
        });
    };

    onLoad(false);

    /* --------------------------------------------- ON LOAD END ---------------------------------------------- */

    /* --------------------------------------- ON CLICK FUNCTIONS START --------------------------------------- */

    orgAppSearch.pageChange = (newpage) => {
        orgAppSearch.updateSearch('page', newpage);
    };

    orgAppSearch.updateSearch = function(updateType, updateValue) {
        if (updateType!=='page') {
            orgAppSearch.search.page = 1
        }
        orgAppSearch.search.orgId=orgAppSearch.stateParamsOrgId
        // Update current URL without changing the state
        $state.transitionTo('organization.search', orgAppSearch.search, {notify:false});
        onLoad(true);
    };

    orgAppSearch.toggleRequest = function(application) {
        if (!orgAppSearch.packageRequests[application.id]) orgAppSearch.packageRequests[application.id] = application;
        else delete orgAppSearch.packageRequests[application.id];

        DataStorage.setType('orgAppsBeingRequested', orgAppSearch.packageRequests);
        processNumberOfRequestedApps(orgAppSearch.packageRequests[application.id]);
    };

    orgAppSearch.saveRequestsAndCheckout = function() {
        DataStorage.setType('orgAppsBeingRequested', orgAppSearch.packageRequests);
        $state.go('organization.newRequestReview',{orgId:orgAppSearch.stateParamsOrgId});
    };

    /* ---------------------------------------- ON CLICK FUNCTIONS END ---------------------------------------- */

});
