var express = require('express')
var router = express.Router()

const models = require('../models')

router.get('/software', isLoggedIn, function (req, res, next) {
  models.Software.findAll({
    include: [models.Approvers]
  }).then(software => {
    software.map(soft => soft.toJSON())
    res.send(software)
  })
})

router.get('/approvers', isLoggedIn, function (req, res, next) {
  models.Approvers.findAll({
    include: [models.Software]
  }).then(approvers => {
    approvers.map(app => app.toJSON())
    res.send(approvers)
  })
})

router.get('/applications', isLoggedIn, function (req, res, next) {
  if (req.user.type === 'user') {
    findUserApplications(req.user, applications => {
      res.send(applications)
    })
  }
  if (req.user.type === 'approver') {
    findApproverApplications(req.user, applications => {
      res.send(applications)
    })
  }
})

function findUserApplications (user, callback) {
  models.Applications.findAll({
    where: { user_id: user.id },
    include: [models.Software]
  })
    .then(applications => {
      applications.map(app => app.toJSON())
      callback(applications)
    })
}

function findApproverApplications (user, callback) {
  models.Approvers.findOne({
    where: { first_name: user.first_name, last_name: user.last_name },
    include: [models.Software]
  })
    .then(approver => {
      if (approver == null) {
        callback(null)
        return
      }

      const softwareIds = approver.Software.map(soft => soft.toJSON().id)

      models.Applications.findAll({
        where: { software_id: softwareIds },
        include: [models.User, models.Software]
      })
        .then(applications => {
          applications.map(app => app.toJSON())
          callback(applications)
        })
    })
}

router.post('/applications', isLoggedIn, (req, res, next) => {
  let newApp = {}
  newApp.software_id = req.body.softwareId
  newApp.reason = req.body.reason
  newApp.user_id = req.user.id
  newApp.status = 'Pending Approval'
  models.Applications.create(newApp)
    .then(function (app) {
      req.flash('alertType', 'success')
      req.flash('alertMessage', 'New software application submitted successfully.')
      res.redirect('/view-applications')
    })
})

router.post('/applications/delete', isLoggedIn, (req, res, next) => {
  const id = req.body.applicationId
  const userId = req.user.id
  models.Applications.destroy({ where: { id: id, user_id: userId } })
    .then((application) => {
      req.flash('alertType', 'success')
      req.flash('alertMessage', 'Application deleted successfully.')
      res.redirect('/view-applications')
    })
})

module.exports = router

function isLoggedIn (req, res, next) {
  // if user is authenticated in the session, carry on
  if (req.isAuthenticated()) { return next() }

  // if they aren't redirect them to the home page
  res.redirect('/login')
}
