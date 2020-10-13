class Categories extends Component {
	toggle(p,e){
		p.checked = e.target.checked
		this.props.refresh()
	}
	search(p){
		return !this.state.search || p.name.toLowerCase().includes(this.state.search.toLowerCase()) || p.stores.find(s => s.toLowerCase().includes(this.state.search.toLowerCase()))
	}

	clearAll(){
		this.state.search = undefined
		this.props.categories.forEach(c => c.checked = false)
		this.props.refresh()
	}
	render(){
		return h('div',undefined,
			h('div',{class:'form-group mt-2 has-icon-left'},
				h('i',{class:'form-icon fas fa-search'}),
				h('input',{class:'form-input text-center',value:this.state.search,placeholder:'Start typing category or store',onInput:e => this.setState({search:e.target.value})})
			),
			h('div',{class:'text-center'},
				h('button',{class:'btn',onClick:e => this.clearAll()},'Clear All')
			),
			h('ul',{class:'menu text-center', style:'height:20em ; overflow-y: auto'},
				this.props.categories.filter(p => this.search(p)).map(p => h('li',{class:'menu-item'},
					h('label',{class:"form-checkbox d-inline-flex"},
				    	h('input',{type:"checkbox",checked:p.checked,onInput:e => this.toggle(p,e)}),
				    	h('i',{class:"form-icon"}),
				    	this.props.config && h('img',{class:'img-responsive mr-1',style:'height:2em',src:this.props.config.categories.images[p.name]}),
				    	`${p.name} (${p.stores.join(', ')})`
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
		if(this.state.stores.length === 1){
			this.state.stores.forEach(s => s.checked = true)
			this.props.refresh()
		}
	}
	toggle(p,e){
		p.checked = e.target.checked
		this.props.refresh()
	}
	search(p){
		return !this.state.search || p.name.toLowerCase().includes(this.state.search.toLowerCase())
	}
	clearAll(){
		this.state.search = undefined
		this.state.stores.forEach(c => c.checked = false)
		this.props.refresh()
	}
	render(){
		return h('div',undefined,
			h('div',{class:'form-group mt-2 has-icon-left'},
				h('i',{class:'form-icon fas fa-search'}),
				h('input',{class:'form-input text-center',value:this.state.search,placeholder:'Start typing store',onInput:e => this.setState({search:e.target.value})})
			),
			h('div',{class:'text-center'},
				h('button',{class:'btn',onClick:e => this.clearAll()},'Clear All')
			),
			h('ul',{class:'menu text-center',style:'height: 20em ; overflow-y: auto'},
				this.state.stores.filter(p => this.search(p)).map(p => h('li',{class:'menu-item'},
					h('label',{class:"form-checkbox d-inline-flex"},
				    	h('input',{type:"checkbox",checked:p.checked,onInput:e => this.toggle(p,e)}),
				    	h('i',{class:"form-icon"}),
				    	this.props.config && h('img',{class:'img-responsive mr-1',title:p.name,style:'height:3em',src:this.props.config.stores.images[p.name],alt:p.name})
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
	}
	prev(){
		this.state.offset -= this.props.config.preview.pageSize
		this.setState({offset:Math.max(0,this.state.offset)})
	}
	next(){
		this.state.offset += this.props.config.preview.pageSize
		this.setState({offset:Math.min(this.props.data.length-1,this.state.offset)})
	}
	render(){
		const data = this.props.data
		const coeff = (this.props.sort.desc ? -1 : 1)
		if(this.props.sort.name){
			data.sort((a,b) => a[this.props.sort.name] > b[this.props.sort.name] ? 1*coeff : -1*coeff)
		}
		const pages = Math.ceil(this.props.data.length/this.props.config.preview.pageSize)
		return h('div',undefined,
			h('table',{class:`hide-xs table table-striped ${this.props.fields.length > 6 ? 'table-scroll' : ''}`,style:'height:30em ; overflow-y:auto'},
				h('thead',undefined,
					h('tr',undefined,
						this.props.fields.map(f => h('th',undefined,f.name))
					)
				),
				h('tbody',undefined,
					data.slice(this.state.offset,this.state.offset+this.props.config.preview.pageSize).map(r => h('tr',undefined,
						this.props.fields.map(f => h('td',undefined,
							f.name === 'image' ? h('a',{href:r.link,target:'_blank'},
								h('img',{class:'img-responsive',src:r[f.name]})
							) : r[f.name]
						))
					))
				)
			),
			h('div',{class:'show-xs',style:'padding-top: 1em'},
				data.slice(this.state.offset,this.state.offset+this.props.config.preview.pageSize).map(r => 
					h('div',{class:'card'},
						r.image && h('div',{class:'card-image'},
							h('a',{href:r.link,target:'_blank',class:'float-left'},
								h('img',{class:'img-responsive',src:r.image})
							),
							this.props.config && h('img',{class:'img-responsive float-right',title:r.store,style:'height:3em',src:this.props.config.stores.images[r.store],alt:r.store})
						),
						h('div',{class:'card-header'},
							h('div',{class:'card-title h4'},r.name)
						),
						h('div',{class:'card-body'},
							h('div',{class:'card-title h6 columns'}, 
								r.salePrice && h('div',{class:'column col text-center'},`Sale Price: $${r.salePrice.toLocaleString()}`),
								r.regPrice && h('div',{class:'column col text-center'},`MSRP: $${r.regPrice.toLocaleString()}`)
							)
						)
					)
				)
			),
			h('div',{class:'h6 text-center'},`Page: ${pages && Math.ceil(this.state.offset/this.props.config.preview.pageSize)+1 || 0}/${pages}`),
			h('div',{class:'btn-group btn-group-block'},
				h('button',{class:'btn',disabled:!this.state.offset,onClick:e => this.prev()},'Prev Page'),
				h('button',{class:'btn',disabled:(this.state.offset+this.props.config.preview.pageSize) >= this.props.data.length,onClick:e => this.next()},'Next Page')
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
				name:'contains the phrase',
				value:'$contains',
				placeholder:'example: blue shoes',
				type:['string']
			},
			{
				name:'contains any of the following phrases',
				placeholder:'put each phrase on a separate line',
				value:'$containsAny',
				type:['string']
			},
			{
				name:'less than or equal',
				value:'$lte',
				placeholder:0.01,
				type:['number']
			},
			{
				name:'greater than or equal',
				value:'$gte',
				placeholder:0.01,
				type:['number']
			}
		]
		this.state.fieldOrder = ['image','name','salePrice','regPrice','link']
		this.state.fieldOrder = this.state.fieldOrder.reduce((a,c,i) => {
			a.set(c,i+1)
			return a
		}, new Map())
		this.state.query = undefined
		this.state.checkedFields = new Set(['image','name','salePrice','regPrice'])
		this.state.noFilterFields = new Set(['link','id','image'])
		this.state.filterFields = []
	}
	async componentDidMount(){
		let fields = new Map()
		this.setState({loading:true})
		for(let i = 0 ; i < this.state.pairs.length ; i++){
			const p = this.state.pairs[i]
			const r = await listFiles(this.props.config.apiKey, p.store, p.category)
			if(r.files.length){
				const f = await getFile(this.props.config.apiKey, r.files[0].id)
				f.date = new Date(f.date)
				this.state.lastUpdated = this.state.lastUpdated > f.date ? this.state.lastUpdated : f.date
				if(f.items.length){
					Object.keys(f.items[0]).forEach(k => {
						fields.set(k, fields.get(k) || {from:[],type:typeof f.items.find(i => i[k] !== undefined && i[k] !== null)[k]})
						fields.get(k).from.push(p)
					})
					f.items.forEach(r => {
						r.store = f.store
						r.category = f.category
					})
					this.state.data.insert(f.items)
				}
			}
		}
		fields = Array.from(fields.entries()).map(f => ({name:f[0],from:f[1].from,type:f[1].type,checked:this.state.checkedFields.has(f[0])}))
		fields.sort((a,b) => (this.state.fieldOrder.get(a.name) || Number.MAX_SAFE_INTEGER ) - (this.state.fieldOrder.get(b.name) || Number.MAX_SAFE_INTEGER ))
		this.setState({loading:false,lastUpdated:this.state.lastUpdated.toLocaleString(),filterFields:fields.filter(f => !this.state.noFilterFields.has(f.name))})
		this.props.refresh({fields})
		if(this.props.filters.length){
			this.preview()
		}
	}
	toggle(f,e){
		f.checked = e.target.checked
		this.setState(this.state)
	}
	addFilter(){
		const fields = this.state.filterFields
		this.props.filters.push({
			name:fields[0].name,
			type:fields[0].type,
			from:fields[0].from,
			comparator:this.state.comparators.find(c => !c.type || c.type.includes(fields[0].type)).value
		})
		this.setState(this.state)
	}
	updateFilter(f,v,n){
		f[n] = v
		if(n === 'name'){
			f.type = this.props.fields.find(f => f.name === v).type
			f.comparator = this.state.comparators.find(c => c.type.includes(f.type)).value
			f.value = undefined
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
	getPlaceholder(f){
		const p = this.state.comparators.find(c => c.value === f.comparator)
		return p && p.placeholder
	}
	render(){
		const data = this.state.data.find(this.state.query)
		return h('div',undefined,
			this.state.loading ? h(Loading) : h('div',undefined,
				h('div',{class:'divider text-center','data-content':'Filters'}),
				h('div',{class:'mt-1 container'},
					this.props.filters.map((f,i) => h('div',{class:'columns cell'},
						h('div',{class:'column col-3 col-sm-12'},
							h('select',{class:'form-select',value:f.name,onInput:e => this.updateFilter(f,e.target.value,'name')},this.state.filterFields.map(o => 
								h('option',{value:o.name},prettyCamel(o.name))
							))
						),
						h('div',{class:'column col-3 col-sm-12'},
							h('select',{class:'form-select',value:f.comparator,onInput:e => this.updateFilter(f,e.target.value,'comparator')},this.state.comparators.filter(c => !c.type || c.type.includes(f.type)).map(f => 
								h('option',{value:f.value},f.name)
							))
						),
						h('div',{class:'column col-5 col-sm-12'},
							f.type === 'string' ? 
								h('textarea',{class:'form-input',placeholder:this.getPlaceholder(f),onInput:e => this.updateFilter(f,e.target.value,'value'),value:f.value}) :
								h('input',{class:'form-input',type:'number',step:0.01,placeholder:this.getPlaceholder(f),onInput:e => this.updateFilter(f,e.target.value,'value'),value:f.value})
						),
						h('div',{class:'column col-1 col-sm-12 text-center'},
							h('button',{class:'btn',onClick:e => this.removeFilter(i)},'Remove')
						)
					)),
					h('div',{class:'text-center mt-1'},
						h('button',{class:'btn',onClick:e => this.addFilter()},'Add Filter'),
						!!this.props.filters.length && h('button',{class:'btn',onClick:e => this.preview()},'Preview')
					)
				),
				h('div',{class:'divider text-center','data-content':'Fields'}),
				h('div',{class:'columns container'},
					this.props.fields.map(f => h('div',{class:'col-xs-6 col-2'},
						h('label',{class:"form-checkbox mr-1 d-inline"},
					    	h('input',{type:"checkbox",checked:f.checked,onInput:e => this.toggle(f,e)}),
					    	h('i',{class:"form-icon"}),
					    	prettyCamel(f.name)
					    )
				    ))
				),
				h('div',{class:'divider text-center','data-content':'Sort'}),
				h('div',{class:'columns'},
					h('div',{class:'column col-10'},
						h('select',{class:'form-select',value:this.props.sort.name,onInput:e => this.updateSort('name',e.target.value)},
							this.state.filterFields.map(f => h('option',{value:f.name},prettyCamel(f.name)))
						)
					),
					h('div',{class:'column col-2'},
						h('i',{class:`form-icon fas fa-2x ${this.props.sort.desc ? 'fa-arrow-down' : 'fa-arrow-up'}`, onClick:e => this.updateSort('desc',!this.props.sort.desc)})
					)
				),
				h('div',{class:'divider text-center','data-content':`Results as of: ${this.state.lastUpdated}`}),
				h(Table,{fields:this.props.fields.filter(f => f.checked), data:data, sort:this.props.sort, config:this.props.config})
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
		const payload = {token:google.auth.token()}
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
		alert('Done')
	}
	render(){
		return h('div',{class:'text-center'},
			this.state.loading ? h(Loading) : h('form',{class:'form-group',onSubmit:e => this.save(e)},
				h('label',{class:'form-label'},'Enter a name for your search'),
				h('input',{class:'form-input text-center',value:this.state.name,onInput:e => this.setState({name:e.target.value})}),
				h('button',{class:'btn mt-2'},'Save')
			)
		)
	}
}

class Container extends Common {
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
		this.state.sort = {name:'salePrice', desc:false}
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
			categories.set(p[1], categories.get(p[1]) || {name:p[1], stores:new Set()})
			categories.get(p[1]).stores.add(p[0])
		})
		if(r.LastEvaluatedKey){
			this.getPulls(r.LastEvaluatedKey,stores,categories)
		}
	}
	async componentDidMount(){
		await super.componentDidMount()
		const categories = new Map()
		const stores = new Map()
		this.setState({loading:true})
		await this.getPulls(undefined,stores,categories)
		this.setState({
			categories:Array.from(categories.values()).map(c => {
				c.stores = Array.from(c.stores)
				return c
			}),
			stores:Array.from(stores.values()),
			loading:false
		})
	}
	content(){
		const screen = this.state.screens[this.state.screenId]
		return h('div',{class:'container'},
			h('div',{class:'btn-group-block btn-group'},
				h('button',{class:'btn',disabled:!this.state.screenId,onClick:e => this.prev()},'Previous'),
				h('button',{class:'btn',disabled:!screen.good(),onClick:e => this.next()},'Next')
			),
			this.state.loading ? h(Loading) : h(screen.screen,{
				filters:this.state.filters,
				categories:this.state.categories, 
				stores:this.state.stores, 
				fields:this.state.fields,
				sort:this.state.sort,
				config:this.state.config,
				email:this.state.email,
				refresh:(state) => this.setState(state || this.state)
			})
		)
	}
}

document.addEventListener('DOMContentLoaded', () => {
	gapi.load('client:auth2', () => {
		render(h(Container), document.body)
	})
})