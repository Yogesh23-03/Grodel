const router = require('express').Router(); const isAuth = require('../middlewares/isAuth'); const c = require('../controllers/mealSchedule.controllers')
router.get('/', isAuth, c.getSchedule); router.put('/slot', isAuth, c.upsertSlot); router.delete('/slot/:mealType', isAuth, c.deleteSlot); router.put('/slot/:mealType/selection', isAuth, c.setSelection); module.exports = router
