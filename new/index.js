const google = {parentFolder:'1DEa44BMHpuygfgfndVnQNoXPqCNoj_hM',url:'https://www.googleapis.com/drive/v3'}
const params = new URLSearchParams(window.location.search)
if(params.get('token') && params.get('email')){
	window.localStorage.setItem('token', params.get('token'))
	window.localStorage.setItem('email', params.get('email'))
	history.pushState({},undefined,window.location.href.replace(window.location.search,''))
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
	const params = `key=${apiKey}&spaces=drive&pageSize=1&q='${google.parentFolder}' in parents and name contains '${store}__${category}'`
	return await fetch(google.url+'/files?'+params).then(r => r.json())
}

const getFile = async (apiKey, id) => {
	const params = `key=${apiKey}&alt=media`
	return await fetch(google.url+/files/+id+'?'+params).then(r => r.json())
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

/**********************************************/

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
			h('ul',{class:'menu text-center', style:'height:20em ; overflow-y: auto'},
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
			h('ul',{class:'menu text-center',style:'height: 20em ; overflow-y: auto'},
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
	constructor(props){
		super(props)
		this.state.offset = 0
		this.state.pageSize = 20
	}
	prev(){
		this.state.offset -= this.state.pageSize
		this.setState({offset:Math.max(0,this.state.offset)})
	}
	next(){
		this.state.offset += this.state.pageSize
		this.setState({offset:Math.min(this.props.data.length-1,this.state.offset)})
	}
	render(){
		const data = this.props.data
		const coeff = (this.props.sort.desc ? -1 : 1)
		if(this.props.sort.name){
			data.sort((a,b) => a[this.props.sort.name] > b[this.props.sort.name] ? 1*coeff : -1*coeff)
		}
		return h('div',undefined,
			h('table',{class:`table table-striped ${this.props.fields.length > 6 ? 'table-scroll' : ''}`,style:'height:30em ; overflow-y:auto'},
				h('thead',undefined,
					h('tr',undefined,
						this.props.fields.map(f => h('th',undefined,f.name))
					)
				),
				h('tbody',undefined,
					data.slice(this.state.offset,this.state.offset+this.state.pageSize).map(r => h('tr',undefined,
						this.props.fields.map(f => h('td',undefined,
							f.name === 'image' ? h('img',{class:'img-responsive',src:r[f.name]}) : r[f.name]
						))
					))
				)
			),
			h('div',{class:'columns'},
				h('div',{class:'column col-4 col-mx-auto btn-group'},
					h('button',{class:'btn',disabled:!this.state.offset,onClick:e => this.prev()},'Prev'),
					h('label',{class:'form-label ml-1 mr-1'},`${Math.floor(this.state.offset/this.state.pageSize)+1}/${Math.round(this.props.data.length/this.state.pageSize)}`),
					h('button',{class:'btn',disabled:(this.state.offset+this.state.pageSize) >= this.props.data.length,onClick:e => this.next()},'Next')
				)
			)
		)
	}
}

class Filter extends Component {
	constructor(props){
		super(props)
		this.state.pairs = generatePairs(this.props.categories, this.props.stores)
		this.state.data  = db.getCollection('coll')
		this.state.data.clear()
		this.state.comparators = [
			{
				name:'equal to',
				value:'$eq'
			},
			{
				name:'not equal to',
				value:'$ne'
			},
			{
				name:'in any of the following',
				value:'$in'
			},
			{
				name:'not in any of the following',
				value:'$nin'
			},
			{
				name:'contains the word',
				value:'$contains',
				type:['string']
			},
			{
				name:'contains any of the following words',
				value:'$containsAny',
				type:['string']
			},
			{
				name:'is between',
				value:'$between',
				type:['number']
			},
			{
				name:'greater than',
				value:'$gt',
				type:['number']
			},
			{
				name:'less than',
				value:'$lt',
				type:['number']
			},
			{
				name:'greater than or equal',
				value:'$gte',
				type:['number']
			},
			{
				name:'less than or equal',
				value:'$lte',
				type:['number']
			}
		]
		this.state.fieldOrder = ['image','name','salePrice','regPrice','link']
		this.state.fieldOrder = this.state.fieldOrder.reduce((a,c,i) => {
			a.set(c,i+1)
			return a
		}, new Map())
		this.state.query = undefined
	}
	async componentDidMount(){
		let fields = new Map()
		this.setState({loading:true})
		for(let i = 0 ; i < this.state.pairs.length ; i++){
			const p = this.state.pairs[i]
			const r = await listFiles(this.props.apiKey, p.store, p.category)
			if(r.files.length){
				const f = await getFile(this.props.apiKey, r.files[0].id)
				f.date = new Date(f.date)
				this.state.lastUpdated = this.state.lastUpdated > f.date ? this.state.lastUpdated : f.date
				if(f.items.length){
					Object.keys(f.items[0]).forEach(k => {
						fields.set(k, fields.get(k) || {from:[],type:typeof f.items.find(i => i[k] !== undefined && i[k] !== null)[k]})
						fields.get(k).from.push(p)
					})
					this.state.data.insert(f.items)
				}
			}
		}
		this.setState({loading:false,lastUpdated:this.state.lastUpdated.toLocaleString()})
		fields = Array.from(fields.entries()).map(f => ({name:f[0],from:f[1].from,type:f[1].type,checked:true}))
		fields.sort((a,b) => (this.state.fieldOrder.get(a.name) || Number.MAX_SAFE_INTEGER ) - (this.state.fieldOrder.get(b.name) || Number.MAX_SAFE_INTEGER ))
		this.props.refresh({fields})
	}
	toggle(f,e){
		f.checked = e.target.checked
		this.setState(this.state)
	}
	addFilter(){
		this.props.filters.push({
			name:this.props.fields[0].name,
			type:this.props.fields[0].type,
			from:this.props.fields[0].from,
			comparator:this.state.comparators.find(c => !c.type || c.type.includes(this.props.fields[0].type)).value
		})
		this.setState(this.state)
	}
	updateFilter(f,v,n){
		f[n] = v
		if(n === 'name'){
			f.type = this.props.fields.find(f => f.name === v).type
		}
		this.setState(this.state)
	}
	removeFilter(i){
		this.props.filters.splice(i,1)
		this.preview()
	}
	preview(){
		this.setState({query:buildQueries(this.props.filters)})
	}
	updateSort(k,v){
		this.props.sort[k] = v
		this.setState(this.state)
	}
	render(){
		const data = this.state.data.find(this.state.query)
		return h('div',undefined,
			this.state.loading ? h(Loading) : h('div',undefined,
				h('div',{class:'divider text-center','data-content':'Filters'}),
				h('div',{class:'mt-1'},
					this.props.filters.map((f,i) => h('div',{class:'columns'},
						h('div',{class:'column col-3'},
							h('select',{class:'form-select',value:f.name,onInput:e => this.updateFilter(f,e.target.value,'name')},this.props.fields.filter(f => f.name !== 'image').map(o => 
								h('option',{value:o.name},o.name)
							))
						),
						h('div',{class:'column col-3'},
							h('select',{class:'form-select',value:f.comparator,onInput:e => this.updateFilter(f,e.target.value,'comparator')},this.state.comparators.filter(c => !c.type || c.type.includes(f.type)).map(f => 
								h('option',{value:f.value},f.name)
							))
						),
						h('div',{class:'column col-5'},
							h('textarea',{class:'form-input',onInput:e => this.updateFilter(f,e.target.value,'value'),value:f.value})
						),
						h('div',{class:'column col-1'},
							h('button',{class:'btn',onClick:e => this.removeFilter(i)},'Remove')
						)
					)),
					h('div',{class:'text-center mt-1'},
						h('button',{class:'btn',onClick:e => this.addFilter()},'Add Filter'),
						!!this.props.filters.length && h('button',{class:'btn',onClick:e => this.preview()},'Preview')
					)
				),
				h('div',{class:'divider text-center','data-content':'Fields'}),
				h('div',{class:'text-center'},
					this.props.fields.map(f => h('label',{class:"form-checkbox mr-1 d-inline"},
				    	h('input',{type:"checkbox",checked:f.checked,onInput:e => this.toggle(f,e)}),
				    	h('i',{class:"form-icon"}),
				    	f.name
				    ))
				),
				h('div',{class:'divider text-center','data-content':'Sort'}),
				h('div',{class:'columns'},
					h('div',{class:'column col-10'},
						h('select',{class:'form-select',value:this.props.sort.name,onInput:e => this.updateSort('name',e.target.value)},
							this.props.fields.map(f => h('option',{value:f.name},f.name))
						)
					),
					h('div',{class:'column col-2'},
						h('label',{class:"form-checkbox ml-1"},
					    	h('input',{type:"checkbox",checked:this.props.sort.desc,onInput:e => this.updateSort('desc',e.target.checked)}),
					    	h('i',{class:"form-icon"}),
					    	'Descending?'
					    )
					)
				),
				h('div',{class:'divider text-center','data-content':`Data Preview (${data.length} results) (Last Updated: ${this.state.lastUpdated})`}),
				h(Table,{fields:this.props.fields.filter(f => f.checked), data:data, sort:this.props.sort})
			)
		)
	}
}

class Review extends Component{
	filterPairs(){
		let pairs = generatePairs(this.props.categories, this.props.stores).filter(p => this.props.fields.filter(f => f.checked).find(f => hasPair(f,p)))
		if(this.props.filters.length){
			pairs = pairs.filter(p => this.props.filters.find(f => hasPair(this.props.fields.find(f1 => f.name === f1.name),p)))
		}
		return pairs
	}
	async save(e){
		e.preventDefault()
		this.props.sort.order = this.props.sort.desc ? 'desc' : 'asc'
		const payload = {token:window.localStorage.getItem('token')}
		payload.queries = this.filterPairs().map(p => ({
			find:buildQueries(this.props.filters.filter(f => hasPair(f,p))),
			select:this.props.fields.filter(f => f.checked && hasPair(f,p)).map(f => f.name),
			store:p.store,
			category:p.category,
			name:this.state.name,
			sort:this.props.sort.name && hasPair(this.props.fields.find(f => f.name === this.props.sort.name), p) && this.props.sort  
		}))
		this.setState({loading:true})
		await lambda.invoke({
			FunctionName:'shopwatch_add_query',
			Payload:JSON.stringify(payload)
		}).promise()
		this.setState({loading:false})
	}
	render(){
		return h('div',{class:'text-center'},
			this.state.loading ? h(Loading) : h('form',{class:'form-group',onSubmit:e => this.save(e)},
				h('label',{class:'form-label'},'Search Name'),
				h('input',{class:'form-input',value:this.state.name,onInput:e => this.setState({name:e.target.value})}),
				h('button',{class:'btn'},'Save')
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
			},
			{
				screen:Review,
				good:() => false
			}
		]
		this.state.categories = []
		this.state.stores = []
		this.state.filters = []
		this.state.fields = []
		this.state.sort = {}
	}
	next(){
		this.setState({screenId:Math.min(this.state.screenId+1, this.state.screens.length-1)})
	}
	prev(){
		this.setState({screenId:Math.max(this.state.screenId-1, 0)})
	}
	async getPulls(key,stores,categories){
		const r = await dynamodb.scan({
			TableName:'shopwatch_pulls',
			ExclusiveStartKey:key
		}).promise()
		r.Items.forEach(p => {
			p = p.partitionKey.split('|')
			stores.set(p[0], stores.get(p[0]) || {name:p[0], categories:new Set()})
			stores.get(p[0]).categories.add(p[1])
			categories.add(p[1])
		})
		if(r.LastEvaluatedKey){
			this.getPulls(r.LastEvaluatedKey,stores,categories)
		}
	}
	async getConfig(){
		return await dynamodb.get({
			TableName:'shopwatch_queries',
			Key:{
				partitionKey:'_config',
				sortKey:'_config'
			}
		}).promise()
	}
	async componentDidMount(){
		const categories = new Set()
		const stores = new Map()
		this.setState({loading:true})
		await this.getPulls(undefined,stores,categories)
		this.setState({loading:false})
		this.setState({
			categories:Array.from(categories).map(c => ({name:c})),
			stores:Array.from(stores.values())
		})
		this.state.apiKey = (await this.getConfig()).Item.apiKey
	}
	hasAuth(){
		return window.localStorage.getItem('email') && window.localStorage.getItem('token')
	}
	content(){
		const screen = this.state.screens[this.state.screenId]
		return h('div',{class:'container'},
			h('div',{class:'btn-group-block btn-group'},
				h('button',{class:'btn',onClick:e => this.prev()},'Previous'),
				h('button',{class:'btn',disabled:!screen.good(),onClick:e => this.next()},'Next')
			),
			this.state.loading ? h(Loading) : h(screen.screen,{
				apiKey:this.state.apiKey, 
				filters:this.state.filters,
				categories:this.state.categories, 
				stores:this.state.stores, 
				fields:this.state.fields,
				sort:this.state.sort,
				refresh:(state) => this.setState(state || this.state)
			})
		)
	}
	render(){
		return this.hasAuth() ? this.content() : h(Auth)
	}
}

document.addEventListener('DOMContentLoaded', () => render(h(Container), document.body))