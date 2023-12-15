const Joi = require('joi')


const userInfoSchema =  Joi.object({
  email: Joi.string()
  .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } }).lowercase(),

  phone_number: Joi.string().
  min(10).max(10)

})

const announceSchmea = Joi.object({
  price: Joi.number().min(1).max(1000000),
  product_title: Joi.string().min(3).max(150),
  description: Joi.string().min(10).max(250),
  photo: Joi.string().allow(!null)
})

module.exports = {userInfoSchema, announceSchmea}