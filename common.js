const google = {
	drive:{
		parentFolder:'1DEa44BMHpuygfgfndVnQNoXPqCNoj_hM',
		url:'https://www.googleapis.com/drive/v3'
	},
	auth:{
		scope:'email',
		get:() => google.auth.gAuth,
		token:() => google.auth.get().currentUser.get().getAuthResponse().id_token
	}
}

const IdentityPoolId = 'us-east-1:4bc785c7-871b-4ebe-bd34-22e168724794'
AWS.config.region = 'us-east-1'
AWS.config.credentials = new AWS.CognitoIdentityCredentials({IdentityPoolId})

const {h,render,Component} = window.preact

const dynamodb = new AWS.DynamoDB.DocumentClient({convertEmptyValues:true})
const lambda = new AWS.Lambda()

const db = new loki('db')
db.addCollection('coll')

const listFiles = async (apiKey, store, category) => {
	const params = `key=${apiKey}&spaces=drive&pageSize=1&q='${google.drive.parentFolder}' in parents and name contains '${store}__${category}'`
	return await fetch(google.drive.url+'/files?'+params).then(r => r.json())
}

const getFile = async (apiKey, id) => {
	const params = `key=${apiKey}&alt=media`
	return await fetch(google.drive.url+/files/+id+'?'+params).then(r => r.json())
}

const auth = async (apiKey, clientId) => {
	const params = `key=${apiKey}&alt=media`
	return await fetch(google.auth.url+/files/+id+'?'+params).then(r => r.json())
}

const buildQueries = (filters) => {
	const multi = ['$in','$nin','$containsAny']
	return filters.filter(f => f.name && f.comparator && f.type && f.value).reduce((a,f) => {
		let q = f.value.split('\n')
		if(f.type === 'number'){
			q = q.map(v => parseFloat(v))
		}
		if(f.comparator === '$between'){
			if(q.length < 2){
				return a
			}
			q = q.slice(0,2)
		}else if(!multi.includes(f.comparator)){
			q = q[0]
		}
		a[f.name] = {[f.comparator]:q}
		return a
	},{})
}

const generatePairs = (categories, stores) => {
	return categories.filter(c => c.checked).reduce((a,c) => {
		stores.filter(s => s.checked && s.categories.has(c.name)).forEach(s => a.push({store:s.name, category:c.name}))
		return a
	},[])
}

const hasPair = (filter,pair) => {
	return filter.from.find(f => f.category === pair.category && f.store === pair.store)
}

const prettyCamel = (str) => {
    return str.match(/^[a-z]+|[A-Z][a-z]*/g).map((x) => {
        return x[0].toUpperCase() + x.substr(1).toLowerCase()
    }).join(' ')
}

/*******************/

class Common extends Component {
	render(){
		return h('div',{class:'container'},
			h(Header),
			google.auth.get() === undefined ? h(Loading) : this.hasAuth() ? this.content() : h(Auth)
		)
	}
	async signIn(isSignedIn){
		if(isSignedIn){
			this.setState({email:google.auth.get().currentUser.get().getBasicProfile().getEmail()})
		}
	}
	async componentDidMount(){
		const config = await dynamodb.get({
			TableName:'configs',
			Key:{
				partitionKey:'shopwatch'
			}
		}).promise()
		this.setState({config:config.Item})
		google.auth.gAuth = await gapi.auth2.init({
			clientId:this.state.config.clientId,
			scope:google.auth.scope
		})
		google.auth.get().isSignedIn.listen((isSignedIn) => this.signIn(isSignedIn))
		this.signIn(google.auth.get().isSignedIn.get())
	}
	hasAuth(){
		return google.auth.get() && google.auth.get().isSignedIn.get()
	}
}

class Header extends Component {
	render(){
		return h('div',{class:'navbar bg-dark mb-2'},
			h('div',{class:'navbar-section text-center'},
				h('a',{href:'/shopwatch/new',class:'text-light'},'New')
			),
			h('div',{class:'navbar-center'},
				h('img',{class:'img-responsive',style:'height: 3em',src:'../logo.jpg'})
			),
			h('div',{class:'navbar-section text-center'},
				h('a',{href:'/shopwatch/view', class:'text-light'},'View')
			)
		)
	}
}

class Loading extends Component {
	render(){
		return h('div',undefined,
			h('div',{class:'h4 loading'})
		)
	}
}

class Auth extends Component {
	async googleSignIn(e){
		await google.auth.get().signIn()
	}
	render(){
		return h('div',{class:'btn-group btn-group-block'},
			h('button',{class:'btn',onClick:e => this.googleSignIn(e)},
				h('i',{class:'fab fa-google mr-1'}),
				'Sign In'
			)
		)
	}
}