import express from 'express';
import bcrypt from 'bcrypt-nodejs';
import cors from 'cors';
import knex from 'knex';
import fetch from 'node-fetch';



const setupClarifai = (imageUrl) => {

// Your PAT (Personal Access Token) can be found in the Account's Security section
const PAT = 'fc7d0cdd35754a598b040ddd372a8ad3';
// Specify the correct user_id/app_id pairings
// Since you're making inferences outside your app's scope
const USER_ID = 'i9ufkd1cgej1';
const APP_ID = 'test';
// Change these to whatever model and image URL you want to use

//const MODEL_ID = 'face-detection';
const IMAGE_URL = imageUrl;


const raw = JSON.stringify({
  "user_app_id": {
      "user_id": USER_ID,
      "app_id": APP_ID
  },
  "inputs": [
      {
          "data": {
              "image": {
                  "url": IMAGE_URL
                  // "base64": IMAGE_BYTES_STRING
              }
          }
      }
  ]
});
const requestOptions = {
  method: 'POST',
  headers: {
      'Accept': 'application/json',
      'Authorization': 'Key ' + PAT
  },
  body: raw
};
return requestOptions;

}


const pgdb =knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: {
    rejectUnauthorized: false
    }
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

app.post('/imageu' ,(req,res)=>{
	console.log(req.body.input);
	fetch("https://api.clarifai.com/v2/models/face-detection/outputs", setupClarifai(req.body.input))
    .then(data => {
    	res.json(data);
  })
    .catch(err => res.status(400).json('unable for api'))
})


app.listen(process.env.PORT || 3001, ()=>{
	console.log(`running on port ${process.env.PORT}`)
})