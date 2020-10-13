class Container extends Common {
	constructor(props){
		super(props)
		this.state.queries = []
		this.state.comparators = {
			'$lte':{
				format:v => `$${v}`,
				label:'Less Than or Equal To'
			},
			'$gte':{
				format:v => `$${v}`,
				label:'Greater Than or Equal To'
			},
			'$contains':{
				format:v => v,
				label:'Contains the Phrase'
			},
			'$containsAny':{
				format:v => v,
				label:'Contains any of the Phrases'
			}
		}
	}
	async getQueries(key){
		this.setState({loading:true})
		const res = await lambda.invoke({
			FunctionName:'shopwatch_get_queries',
			Payload:JSON.stringify({
				token:google.auth.token()
			})
		}).promise()
		this.setState({loading:false, queries:JSON.parse(res.Payload)})
	}
	async signIn(isSignedIn){
		super.signIn(isSignedIn)
		if(isSignedIn){
			await this.getQueries()
		}
	}
	async componentDidMount(){
		await super.componentDidMount()
	}
	async delete(){
		this.setState({loading:true})
		await lambda.invoke({
			FunctionName:'shopwatch_delete_query',
			Payload:JSON.stringify({
				queries:this.state.queries.filter(q => q.checked).map(q => ({partitionKey:q.partitionKey,sortKey:q.sortKey, email:q.email})),
				token:google.auth.token()
			})
		}).promise()
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
					h('button',{class:'btn',onClick:e => this.delete()},`Delete ${this.state.queries.filter(q => q.checked).length} Selected`)
				),
				!this.state.queries.length ? h('div',{class:'empty mt-2'},
					h('div',{class:'h5 text-center'}, 'No Searches Found')
				) : this.state.queries.map(q => h('div',{class:'card mt-2'},
					h('div',{class:'card-header'},
						h('div',{class:'columns'},
							h('div',{class:'col-4'}),
							h('div',{class:'col-4'},
								h('div',{class:'card-title h5 text-center'},q.name)
							),
							h('div',{class:'col-4'},
								h('label',{class:"form-checkbox float-right"},
							    	h('input',{type:"checkbox",checked:q.checked,onInput:e => this.select(q,e)}),
							    	h('i',{class:"form-icon"}),
							    	h('span',undefined,'Delete?')
							    )
							)
						)
					),
					h('div',{class:'card-body text-center'},
						h('div',{class:'divider','data-content':'Selected Fields'}),
						h('div',undefined,
							q.select.map(s => h('span',{class:'chip mr-1'},prettyCamel(s)))
						),
						!!q.sort && [
							h('div',{class:'divider','data-content':'Sorting'}),
							h('div',undefined,
								h('span',{class:'chip'},prettyCamel(q.sort.name)),
								h('span',{class:'chip'},
									h('i',{class:`form-icon fas ${q.sort.order === 'asc' ? 'fa-arrow-up' : 'fa-arrow-down'}`})
								)
							)
						],
						!!q.find && [
							h('div',{class:'divider','data-content':'Filters'}),
							Object.keys(q.find).map(k => {
								const c = Object.keys(q.find[k])[0], v = Object.values(q.find[k])[0]
								return h('div',{class:'columns cell mt-1'},
									h('div',{class:'col-4'},prettyCamel(k)),
									h('div',{class:'col-4'},this.state.comparators[c].label),
									h('div',{class:'col-4'},this.state.comparators[c].format(v))
								)
							})
						]
					),
					h('div',{class:'card-footer'},
						h('div',{class:'h6 text-center'},`${q.category} from ${q.store}`)
					)
				))
			)
		)
	}
}

document.addEventListener('DOMContentLoaded', () => {
	gapi.load('client:auth2', () => {
		render(h(Container), document.body)
	})
})