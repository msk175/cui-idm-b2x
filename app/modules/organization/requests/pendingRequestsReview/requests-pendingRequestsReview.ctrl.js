angular.module('organization')
.controller('pendingRequestsReviewCtrl', function(DataStorage, Loader, ServicePackage, $q, $state, $stateParams, $timeout) {
    'use strict'

    const pendingRequestsReview = this
    const userId = $stateParams.userId
    const orgId = $stateParams.orgId

    pendingRequestsReview.success = false
    pendingRequestsReview.approvedCount = 0
    pendingRequestsReview.deniedCount = 0

    // HELPER FUNCTIONS START ------------------------------------------------------------------------

    const getApprovalCounts = (requests) => {
        requests.forEach(request => {
            switch (request.approval) {
                case 'approved':
                    pendingRequestsReview.approvedCount += 1
                    break
                case 'denied':
                    pendingRequestsReview.deniedCount += 1
                    break
            }
        })
    }

    // HELPER FUNCTIONS END --------------------------------------------------------------------------

    // ON LOAD START ---------------------------------------------------------------------------------

    Loader.onFor('pendingRequestsReview.init')

    const requestData = DataStorage.getType('appRequests')

    pendingRequestsReview.pendingRequests = requestData.packages
    pendingRequestsReview.user = requestData.user

    if (pendingRequestsReview.pendingRequests.length > 0) {
        getApprovalCounts(pendingRequestsReview.pendingRequests)
    }

    Loader.offFor('pendingRequestsReview.init')

    // ON LOAD END -----------------------------------------------------------------------------------

    // ON CLICK START --------------------------------------------------------------------------------

    pendingRequestsReview.submit = () => {
        let submitCalls = []

        pendingRequestsReview.pendingRequests.forEach(packageRequest => {
            submitCalls.push(ServicePackage.handlePackageApproval(packageRequest))
        })

        $q.all(submitCalls)
        .then(() => {
            pendingRequestsReview.success = true
            $timeout(() => {
                $state.go('organization.directory.userDetails', { userId: userId, orgId: orgId })
            }, 3000)
        })
    }

    pendingRequestsReview.goBack = () => {
        $state.go('organization.requests.pendingRequests', { userId: userId, orgId: orgId })
    }

    // ON CLICK END ----------------------------------------------------------------------------------

})
