angular.module('applications')
.controller('myApplicationsCtrl', function(API,APIError,APIHelpers,DataStorage,Loader,User,$filter,$pagination,$q,$scope,$state,$stateParams) {

    const myApplications = this
    const userId = User.user.id
    const loaderName = 'myApplications.'

    let checkedLocalStorage = false

    // HELPER FUNCTIONS START ---------------------------------------------------------------------------------

    const switchBetween = (property, firstValue, secondValue) => {
        // helper function to switch a property between two values or set to undefined if values not passed
        if (!firstValue) {
            myApplications.search[property] = undefined
            return
        }
        myApplications.search[property] = myApplications.search[property] === firstValue
            ? secondValue
            : firstValue
    }

    const getCountsOfStatus=(qsValue)=>{
        let opts = {
            personId: API.getUser(),
            useCuid:true
        }
        //Assign query strings if any value passed 
        //otherwise it will get full count
        if (qsValue) {
            opts.qs = [['grant.status',qsValue]]
        }
        API.cui.getPersonGrantedAppCount(opts)
        .then(res=>{
            if (!qsValue) {
                myApplications.popupCount=res;
            }else if (qsValue==="active") {
                myApplications.activeCount=res;
            }
            else{
                myApplications.suspendedCount=res;
            }
            $scope.$digest();
        })
        .fail(err=>{

        })
    }

    const getCountsOfcategories=()=>{
        myApplications.categories.forEach((category,index)=>{
            console.log($filter('cuiI18n')(category.name))
            let opts = {
                personId: API.getUser(),
                useCuid:true
            }
            opts.qs=[['service.category',$filter('cuiI18n')(category.name)]]
            API.cui.getPersonGrantedAppCount(opts)
            .then(res=>{
                category.count=res;
                if (index===myApplications.categories.length-1) {
                    $scope.$digest();
                };
            })
            .fail(err=>{
                console.log(err);
                if (index===myApplications.categories.length-1) {
                    $scope.$digest();
                };
            })            
        })
    }

    // HELPER FUNCTIONS END -----------------------------------------------------------------------------------

    // ON LOAD START ------------------------------------------------------------------------------------------

    const loadStoredData = () => {
        // Check DataStorage if this page has been loaded before. We initially populate this screen
        // with data that was previously retrieved from the API while we redo calls to get the up to date data.
        const storedData = DataStorage.getType('myApplicationsList')

        if (storedData) {
            Loader.onFor(loaderName + 'apps')
            myApplications.list = storedData.appList
            myApplications.count = storedData.appCount
            myApplications.categories = storedData.categories
            Loader.offFor(loaderName + 'apps')
        }

        checkedLocalStorage = true
        onLoad(false)
    }

    const onLoad = (previouslyLoaded) => {
        if (previouslyLoaded) {
            Loader.onFor(loaderName + 'reloadingApps')
        }
        else {
            checkedLocalStorage ? Loader.onFor(loaderName + 'updating') : Loader.onFor(loaderName + 'apps')
            myApplications.search = Object.assign({}, $stateParams)

            Loader.onFor(loaderName + 'categories')
            API.cui.getPersonAppCategories({personId:API.getUser()})
            .then(res => {
                APIError.offFor(loaderName + 'categories')
                myApplications.categories = res;
                getCountsOfcategories()
                APIError.offFor(loaderName + 'categories')
            })
            .fail(err => {
                APIError.onFor(loaderName + 'categories')
            })
            .done(() => {
                Loader.offFor(loaderName + 'categories')
                $scope.$digest()
            })
        }

        myApplications.search.pageSize = myApplications.search.pageSize || $pagination.getUserValue() || $pagination.getPaginationOptions()[0]

        const opts = {
            personId: API.getUser(),
            useCuid:true,
            qs: APIHelpers.getQs(myApplications.search)
        }

        const promises = [
            API.cui.getPersonGrantedApps(opts), 
            API.cui.getPersonGrantedAppCount(opts)
        ]

        $q.all(promises)
        .then(res => {
            // myApplications.list = Object.assign(res[0]).filter(x => x.hasOwnProperty('urls'))
            myApplications.count = res[1]
            myApplications.list=res[0];
            // re-render pagination if available
            myApplications.reRenderPaginate && myApplications.reRenderPaginate()

            const storageData = {
                appList: myApplications.list, 
                appCount: myApplications.count, 
                categories: myApplications.categories
            }
            DataStorage.setType('myApplicationsList', storageData)
            APIError.offFor(loaderName + 'apps')
        })
        .catch(err => {
            APIError.onFor(loaderName + 'apps')
        })
        .finally(() => {
            if (previouslyLoaded) {
                Loader.offFor(loaderName + 'reloadingApps')
            } 
            else {
                checkedLocalStorage ? Loader.offFor(loaderName + 'updating') : Loader.offFor(loaderName + 'apps')
            }
        })
        //Lazy loading of counts of applications based on status 
        //to display in popover
        getCountsOfStatus("active")
        getCountsOfStatus("suspended")
        //To getFull count
        getCountsOfStatus(undefined)


    }

    loadStoredData()

    // ON LOAD END --------------------------------------------------------------------------------------------

    // ON CLICK FUNCTIONS START -------------------------------------------------------------------------------

    myApplications.pageChange = (newpage) => {
        myApplications.updateSearch('page', newpage)
    }

    myApplications.updateSearch = (updateType, updateValue) => {
        switch (updateType) {
            case 'alphabetic':
                switchBetween('sortBy', '+service.name', '-service.name')
                break
            case 'date':
                switchBetween('sortBy', '+grant.instant', '-grant.instant')
                break
            case 'status':
                myApplications.search.page = 1
                myApplications.search['grant.status'] = updateValue
                break
            case 'category':
                myApplications.search.page = 1
                myApplications.search['service.category'] = $filter('cuiI18n')(updateValue)
                break
        }

        // doesn't change state, only updates the url
        $state.transitionTo('applications.myApplications', myApplications.search, { notify:false })
        onLoad(true)
    }

    myApplications.goToDetails = (application) => {
        const opts = {
            appId: application.id
        }
        DataStorage.setType('myAppDetail',application)
        $state.go('applications.myApplicationDetails', opts)
    }

    // ON CLICK FUNCTIONS END ---------------------------------------------------------------------------------

})
