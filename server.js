const express = require('express')

const app = express()

app.use('/shopwatch', express.static('.'))

app.listen(8080, () => console.log('started'))