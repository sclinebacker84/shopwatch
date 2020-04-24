const google = {parentFolder:'1DEa44BMHpuygfgfndVnQNoXPqCNoj_hM',url:'https://www.googleapis.com/drive/v3'}

AWS.config.update({region:'us-east-1', credentials:new AWS.CognitoIdentityCredentials({IdentityPoolId: 'us-east-1:4bc785c7-871b-4ebe-bd34-22e168724794'})})

const {h,render,Component} = window.preact
const params = new URLSearchParams(window.location.search)

const dynamodb = new AWS.DynamoDB.DocumentClient({convertEmptyValues:true})
const lambda = new AWS.Lambda()

const listFiles = async (apiKey, store, category) => {
	const params = `key=${apiKey}&spaces=drive&pageSize=1&q='${google.parentFolder}' in parents and name contains '${store}__${category}'`
	return await fetch(google.url+'/files?'+params).then(r => r.json())
}

const getFile = async (apiKey, id) => {
	const params = `key=${apiKey}&alt=media`
	return await fetch(google.url+/files/+id+'?'+params).then(r => r.json())
}

class Loading extends Component {
	render(){
		return h('div',undefined,
			h('div',{class:'h4 loading'})
		)
	}
}

class Categories extends Component {
	toggle(p,e){
		p.checked = e.target.checked
		this.props.refresh()
	}
	search(p){
		return !this.state.search || p.name.toLowerCase().includes(this.state.search)
	}
	render(){
		return h('div',undefined,
			h('div',{class:'form-group mt-2 text-center'},
				h('input',{class:'form-input',onInput:e => this.setState({search:e.target.value})})
			),
			h('ul',{class:'menu text-center'},
				this.props.categories.filter(p => this.search(p)).map(p => h('li',{class:'menu-item'},
					h('label',{class:"form-checkbox"},
				    	h('input',{type:"checkbox",checked:p.checked,onInput:e => this.toggle(p,e)}),
				    	h('i',{class:"form-icon"}),
				    	p.name
				    )
				))
			)
		)
	}
}

class Stores extends Component {
	constructor(props){
		super(props)
		this.state.categories = this.props.categories.filter(c => c.checked)
		this.state.stores = this.props.stores.filter(s => this.state.categories.find(c => s.categories.has(c.name)))
	}
	toggle(p,e){
		p.checked = e.target.checked
		this.props.refresh()
	}
	search(p){
		return !this.state.search || p.name.toLowerCase().includes(this.state.search)
	}
	render(){
		return h('div',undefined,
			h('div',{class:'form-group mt-2 text-center'},
				h('input',{class:'form-input',onInput:e => this.setState({search:e.target.value})})
			),
			h('ul',{class:'menu text-center'},
				this.state.stores.filter(p => this.search(p)).map(p => h('li',{class:'menu-item'},
					h('label',{class:"form-checkbox"},
				    	h('input',{type:"checkbox",checked:p.checked,onInput:e => this.toggle(p,e)}),
				    	h('i',{class:"form-icon"}),
				    	p.name
				    )
				))
			)
		)
	}
}

class Table extends Component {
	render(){
		return h('table',{class:'table table-striped table-scroll',style:'height:30em ; overflow-y:auto'},
			h('thead',undefined,
				h('tr',undefined,
					this.props.fields.map(f => h('th',undefined,f.name))
				)
			),
			h('tbody',undefined,
				this.props.data.map(r => h('tr',undefined,
					this.props.fields.map(f => h('td',undefined,r[f.name]))
				))
			)
		)
	}
}

class Filter extends Component {
	constructor(props){
		super(props)
		this.state.pairs = this.props.categories.filter(c => c.checked).reduce((a,c) => {
			this.props.stores.filter(s => s.checked && s.categories.has(c.name)).forEach(s => a.push({store:s.name, category:c.name}))
			return a
		},[])
		this.state.data = []
		this.state.fields = []
	}
	async componentDidMount(){
		this.setState({fields:new Set(),loading:true})
		for(let i = 0 ; i < this.state.pairs.length ; i++){
			const p = this.state.pairs[i]
			const r = await listFiles(this.props.apiKey, p.store, p.category)
			const f = await getFile(this.props.apiKey, r.files[0].id)
			if(f.items.length){
				Object.keys(f.items[0]).forEach(k => this.state.fields.add(k))
				this.state.data = this.state.data.concat(f.items)
			}
		}
		this.setState({fields:Array.from(this.state.fields).map(f => ({name:f,checked:true})),loading:false})
	}
	toggle(f,e){
		f.checked = e.target.checked
		this.setState(this.state)
	}
	render(){
		return h('div',undefined,
			this.state.loading ? h(Loading) : h('div',undefined,
				h('div',{class:'text-center'},
					this.state.fields.map(f => h('label',{class:"form-checkbox mr-1 d-inline"},
				    	h('input',{type:"checkbox",checked:f.checked,onInput:e => this.toggle(f,e)}),
				    	h('i',{class:"form-icon"}),
				    	f.name
				    ))
				),
				h(Table,{fields:this.state.fields.filter(f => f.checked), data:this.state.data})
			)
		)
	}
}

class Auth extends Component {
	async auth(e){
		e.preventDefault()
		this.setState({loading:true})
		await lambda.invoke({
			FunctionName:'auth',
			Payload:JSON.stringify({email:this.state.email,url:window.location.href,name:'Shopwatch'})
		}).promise()
		this.setState({loading:false})
		alert('Done!')
	}
	render(){
		return h('div',undefined,
			h('form',{class:'form-group text-center',onSubmit:e => this.auth(e)},
				h('label',{class:'form-label'},'Enter Email'),
				h('input',{class:'form-input',onInput:e => this.setState({email:e.target.value})}),
				h('button',{class:`btn mt-1 ${this.state.loading ? 'loading' : ''}`},'Submit')
			)
		)
	}
}

class Container extends Component {
	constructor(props){
		super(props)
		this.state.screenId = 0
		this.state.screens = [
			{
				screen:Categories,
				good:() => this.state.categories.find(c => c.checked)
			},
			{
				screen:Stores,
				good:() => this.state.stores.find(c => c.checked)
			},
			{
				screen:Filter,
				good:() => true
			}
		]
		this.state.categories = []
		this.state.stores = []
	}
	next(){
		this.setState({screenId:Math.min(this.state.screenId+1, this.state.screens.length-1)})
	}
	prev(){
		this.setState({screenId:Math.max(this.state.screenId-1, 0)})
	}
	async getPulls(key){
		const r = await dynamodb.scan({
			TableName:'shopwatch_pulls',
			ExclusiveStartKey:key
		}).promise()
		r.Items.forEach(p => {
			p = p.partitionKey.split('|')
			this.state.stores.set(p[0], this.state.stores.get(p[0]) || {name:p[0], categories:new Set()})
			this.state.stores.get(p[0]).categories.add(p[1])
			this.state.categories.add(p[1])
		})
		if(r.LastEvaluatedKey){
			this.getPulls(r.LastEvaluatedKey)
		}
	}
	async getConfig(){
		return await dynamodb.get({
			TableName:'configs',
			Key:{
				name:window.localStorage.getItem('email'),
				type:'apiKey'
			}
		}).promise()
	}
	async componentDidMount(){
		this.state.categories = new Set()
		this.state.stores = new Map()
		this.setState({loading:true})
		await this.getPulls()
		this.setState({loading:false})
		this.setState({
			categories:Array.from(this.state.categories).map(c => ({name:c})),
			stores:Array.from(this.state.stores.values())
		})
		this.state.apiKey = (await this.getConfig()).Item.value
	}
	hasAuth(){
		return window.localStorage.getItem('email') && window.localStorage.getItem('token')
	}
	content(){
		const screen = this.state.screens[this.state.screenId]
		return h('div',{class:'container'},
			h('div',{class:'btn-group-block btn-group'},
				h('button',{class:'btn',onClick:e => this.prev()},'Previous'),
				h('button',{class:'btn',onClick:e => this.next()},'Next')
			),
			this.state.loading ? h(Loading) : h(screen.screen,{apiKey:this.state.apiKey, categories:this.state.categories, stores:this.state.stores, refresh:() => this.setState(this.state)})
		)
	}
	render(){
		return this.hasAuth() ? this.content() : h(Auth)
	}
}

if(params.get('token') && params.get('email')){
	window.localStorage.setItem('token', params.get('token'))
	window.localStorage.setItem('email', params.get('email'))
	history.pushState({},undefined,window.location.href.replace(window.location.search,''))
}
document.addEventListener('DOMContentLoaded', () => render(h(Container), document.body))