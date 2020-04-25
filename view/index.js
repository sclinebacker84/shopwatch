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

class Loading extends Component {
	render(){
		return h('div',undefined,
			h('div',{class:'h4 loading'})
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
		this.state.queries = []
	}
	async getQueries(key){
		const r = await dynamodb.query({
			TableName:'shopwatch_queries',
			IndexName:'email-index',
			ExclusiveStartKey:key,
			KeyConditions:{
				'email':{
					ComparisonOperator:'EQ',
					AttributeValueList:[window.localStorage.getItem('email')]
				}
			}
		}).promise()
		this.state.queries = this.state.queries.concat(r.Items)
		if(r.LastEvaluatedKey){
			this.getQueries(r.LastEvaluatedKey)
		}
	}
	async componentDidMount(){
		if(this.hasAuth()){
			this.setState({loading:true})
			await this.getQueries()
			this.state.queries.forEach(q => {
				q.name = q.sortKey.substring(0,q.sortKey.indexOf('|'))
			})
			this.setState({loading:false})
		}
	}
	hasAuth(){
		return window.localStorage.getItem('email') && window.localStorage.getItem('token')
	}
	async delete(){
		this.setState({loading:true})
		await lambda.invoke({
			FunctionName:'shopwatch_delete_query',
			Payload:JSON.stringify({
				queries:this.state.queries.filter(q => q.checked).map(q => ({partitionKey:q.partitionKey,sortKey:q.sortKey, email:q.email})),
				token:window.localStorage.getItem('token')
			})
		}).promise()
		this.state.queries = []
		await this.getQueries()
		this.setState({loading:false})
	}
	select(q,e){
		q.checked = e.target.checked
		this.setState(this.state)
	}
	content(){
		return h('div',{class:'container'},
			this.state.loading ? h(Loading) : h('div',undefined,
				!!this.state.queries.find(q => q.checked) && h('div',{class:'text-center'},
					h('button',{class:'btn',onClick:e => this.delete()},'Delete')
				),
				this.state.queries.map(q => h('div',{class:'card mt-2'},
					h('div',{class:'card-header text-center'},
						h('div',{class:'card-title h5'},q.name)
					),
					h('div',{class:'card-body text-center'},
						h('div',undefined,
							h('label',{class:"form-checkbox d-inline"},
						    	h('input',{type:"checkbox",checked:q.checked,onInput:e => this.select(q,e)}),
						    	h('i',{class:"form-icon"}),
						    	'Select for Deletion?'
						    )
						),
						h('div',{class:'divider','data-content':'Selected Fields'}),
						h('div',undefined,
							q.select.map(s => h('span',{class:'chip mr-1'},s))
						),
						!!q.sort && [
							h('div',{class:'divider','data-content':'Sorting'}),
							h('div',undefined,
								h('span',{class:'chip'},q.sort.name),
								h('span',{class:'chip'},q.sort.order)
							)
						],
						!!q.find && [
							h('div',{class:'divider','data-content':'Filter'}),
							h('div',{class:'columns'},
								h('div',{class:'column col-4 col-mx-auto'},
									h('pre',{class:'text-left',style:'height:10em ; overflow-y: auto'},
										JSON.stringify(q.find,null,2)
									)
								)
							)
						]
					),
					h('div',{class:'card-footer text-center'},
						h('div',{class:'columns'},
							h('div',{class:'column col-4 col-mx-auto'},
								h('div',{class:'h6'},q.partitionKey)
							)
						)
					)
				))
			)
		)
	}
	render(){
		return this.hasAuth() ? this.content() : h(Auth)
	}
}

document.addEventListener('DOMContentLoaded', () => render(h(Container), document.body))