
const handleRegister = (req,res, pgdb, bcrypt)=>{
	const {email,name,password}=req.body;
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
}

export default handleRegister;
	
