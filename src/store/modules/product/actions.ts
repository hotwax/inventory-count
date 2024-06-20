import { ProductService } from "@/services/ProductService";	
import { ActionTree } from 'vuex'	
import RootState from '@/store/RootState'	
import ProductState from './ProductState'	
import { hasError, showToast } from '@/utils'	
import { translate } from '@/i18n'	
import emitter from '@/event-bus'	
import { prepareProductQuery } from '@/utils/solrHelper'	


const actions: ActionTree<ProductState, RootState> = {	


}	

export default actions;	
