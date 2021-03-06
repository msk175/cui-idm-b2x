angular.module('organization')
.controller('personRequestReviewCtrl', function(DataStorage, Loader, PersonRequest, ServicePackage, $q, $state, $stateParams, $timeout) {
    'use strict'

    const personRequestReview = this
    const userId = $stateParams.userId
    const orgId = $stateParams.orgId

    personRequestReview.success = false
    personRequestReview.approvedCount = 0
    personRequestReview.deniedCount = 0

    // HELPER FUNCTIONS START ------------------------------------------------------------------------

    const getApprovalCounts = (requests) => {
        requests.forEach(request => {
            switch (request.approval) {
                case 'approved':
                    personRequestReview.approvedCount += 1
                    break
                case 'denied':
                    personRequestReview.deniedCount += 1
                    break
            }
        })
    }

    // HELPER FUNCTIONS END --------------------------------------------------------------------------

    // ON LOAD START ---------------------------------------------------------------------------------

    Loader.onFor('personRequestReview.init')

    const requestData = DataStorage.getType('userPersonRequest').personRequest

    personRequestReview.packages = requestData.packages
    personRequestReview.person = requestData.request.person
    personRequestReview.organization = requestData.request.organization
    personRequestReview.request = requestData.request.request

    if (personRequestReview.packages.length > 0) {
    	getApprovalCounts(personRequestReview.packages)
    }

    Loader.offFor('personRequestReview.init')

    // ON LOAD END -----------------------------------------------------------------------------------

    // ON CLICK START --------------------------------------------------------------------------------

    personRequestReview.submit = () => {
        Loader.onFor('personRequestReview.submitting')

        if (personRequestReview.request.approval === 'approved') {
            PersonRequest.handleRequestApproval('approved', personRequestReview.request)
        }
        else {
            PersonRequest.handleRequestApproval('denied', personRequestReview.request)
        }

        let packageRequestCalls = []

        personRequestReview.packages.forEach(packageRequest => {
            packageRequestCalls.push(ServicePackage.handlePackageApproval(packageRequest))
        })

        $q.all(packageRequestCalls)
        .then(() => {
            Loader.offFor('personRequestReview.submitting')
            personRequestReview.success = true
            $timeout(() => {
                $state.go('organization.directory.userDetails', {userId: userId, orgId: orgId})
            }, 3000)  
        })
    }

    // ON CLICK END ----------------------------------------------------------------------------------

})
