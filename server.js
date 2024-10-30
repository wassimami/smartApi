import express from 'express';
import bcrypt from 'bcrypt-nodejs';
import cors from 'cors';
import knex from 'knex';
import fetch from 'node-fetch';
import Clarifai from 'clarifai'


const pgdb =knex({
  client: 'pg',
  connection: {
    host: 'postgresql-fitted-29775',
    port: 5432,
    user: 'postgres',
    password: '164219',
    database: 'smartb',
  },
});

//pgdb.select('*').from('users').then(data=>console.log(data));

const app = express();

app.use(express.json());
app.use(cors());



app.get('/',(req,res)=>{
	res.send('success');
})

/*app.post('/faced', async (req, res) => {
  try {
    const response = await fetch('https://api.clarifai.com/v2/models/face-detection/outputs', {
      method: 'POST',
      headers: {
        'Authorization': 'fc7d0cdd35754a598b040ddd372a8ad3',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(400).json('error processing request');
  }
});*/

app.post('/signin' , (req,res)=>{
	const {email, password} = req.body
	if(!email || !password ){
		return res.status(400).json('incorrect form')
	}
	pgdb.select('email','hash').from('login').where('email','=',req.body.email)
	.then(data => {
		const isValid = bcrypt.compareSync(password , data[0].hash)
		if(isValid){
			return pgdb.select('*').from('users')
			.where('email','=',email)
			.then(user=> res.json(user[0]))
			.catch(err=> res.status(400).json('unable to connect'))
		}else{
		res.status(400).json('wrong infos')
	    } 
     })
	.catch(err=> res.status(400).json('wrong infos'))

})

app.post('/register' , (req,res)=>{
	const {email,name,password}=req.body;
	if(!email || !name || !password ){
		return res.status(400).json('incorrect form')
	}
	const hash = bcrypt.hashSync(password);
	   pgdb.transaction(trx => {
	   	trx.insert({
	   		hash: hash,
	   		email: email
	   	}).into('login').returning('email').then(loginEmail=> {
		   	return trx('users').returning('*').insert({
		       email: loginEmail[0].email,
		       name: name,
		       joined: new Date()
			 }).then(user=> {
			 	res.json(user[0]);
			 })
	   	})
	   	.then(trx.commit)
	   	.catch(trx.rollback)
	   })		
	 .catch(err=> res.status(400).json('unable to register'))
})

app.get('/profile/:id',(req,res)=>{
	const {id}=req.params;
	pgdb.select('*').from('users').where({id}).then(user => {
		if(user.length){
		   res.json(user[0]);
		}else{
			res.status(400).json('not found')
		}
	})
	.catch(err => res.status(400).json('error getting user'))
	
})

app.put('/image', (req,res)=>{
	const {id}=req.body;
	pgdb('users').where('id', '=', id).increment('entries', 1)
	.returning('entries').then(entries=>{res.json(entries[0].entries)})
	.catch(err => res.status(400).json('unable to get count'))
})


app.listen(process.env.PORT || 3001, ()=>{
	console.log(`running on port ${process.env.PORT}`)
})