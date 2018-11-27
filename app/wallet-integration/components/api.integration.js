import React, { Component } from 'react';
import * as Actions from '../API/models/api/ApiActions';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import AuthorizedApp from '../API/models/AuthorizedApp';
import ApiService from '../API/services/ApiService';
import Identity from '../API/models/Identity';
import { IdentityRequiredFields } from '../API/models/Identity';
import {Blockchains} from '../API/models/Blockchains';
import APIUtils from '../API/util/APIUtils';

import { I18n } from 'react-i18next';
import { Button, Form, Header, Icon, Input, Menu, Message, Modal } from 'semantic-ui-react';
import Prompt from './modals/Prompt';
import Permission from '../API/models/Permission';

import * as WAPII_ACCOUNT_ACTIONS from "../actions/accounts";
import * as WAPII_AUTH_APPS_ACTIONS from "../actions/authorizedApps";
import * as WAPII_IDENTITY_ACTIONS from "../actions/identity";
import * as WAPII_KEYPROVIDER_ACTIONS from "../actions/keyProvider";
import * as WAPII_PERMISSIONS_ACTIONS from "../actions/permissions";
import { useWallet } from "../../shared/actions/wallets";

import PopupService from '../API/services/PopupService';
import SocketService from '../API/services/SocketService';
import Hasher from '../API/util/Hasher';
import IdGenerator from '../API/util/IdGenerator';

let rekeyPromise;
let io = null;

class APIIntegration extends Component<Props> {
  props:{
    keys:{
      account: false
    },
    wallets:[]
  };

  popupPromise = null;

  constructor(props) {
    super(props);
    this.state = {
      keyProviderObfuscated: {},
      open:false
    };

    if(this.props){
      let accounts, identity;
      if(this.props.wallets){
        accounts = this._extractAccounts(this.props);
      }
      
      if(!this.props.wapii || !this.props.wapii.identity){
        identity = Identity.placeholder();
        identity.initialize(Hasher.unsaltedQuickHash(IdGenerator.text(32)))
          .then(()=>{
            this.props.actions.updateIdentity(identity);
          }, (err) => console.error(err))
          .catch((err) => console.error(err));
      }

      accounts = accounts || [];
      
      if(!this.props.wapii || !this.props.wapii.accounts){
        this.props.actions.updateAccounts(accounts);
      }
    }
  }

  onClose = (data) => {
    this.popupPromise.reject(data);
    this.popupPromise = null;
    this.setState({ open: false })
  };
  onSubmit = (data) => {
    this.popupPromise.resolve(data);
    this.popupPromise = null;
    this.setState({ open: false })
  };
  onOpen = (popupData) =>{
    if(this.popupPromise){
      console.error(" POPUP ALREADY OPEN BRO ! BUG ??? ");
    }
    this.setState({ open: true, popupData });
    return new Promise((resolve, reject) => this.popupPromise = {resolve,reject});
  } 

  render() {
    const {
      open,
      popupData
    } = this.state;
    const {
      actions,
      wapii
    } = this.props;
    const {
      queueInfo
    } = wapii;
    return ( 
      <I18n ns="wallet">
        {
          (t) => (
            <Prompt
              actions={actions}
              onClose={this.onClose}
              onSubmit={this.onSubmit}
              open={open}
              data={popupData}
              queueInfo={queueInfo}
            />
          )
        }
      </I18n>
    );
  }

  componentDidMount(){
    PopupService.connect( this.onOpen, this.props.actions );
    SocketService.initialize(this.props.actions);
    APIUtils.plugin.setBlockchain(this.props.blockchain);
  }

  _extractAccounts(props){
    const accs = [];
    for(let i = 0; i < props.wallets.length; i++){
      if(props.wallets[i].accountData){
        for(let j = 0; j < props.wallets[i].accountData.permissions.length; j++){
          accs.push({
            publicKey: props.wallets[i].pubkey,
            name: props.wallets[i].account,
            authority: props.wallets[i].accountData.permissions[j].perm_name
          });
        }
      }
    }
    return accs;
  }

  componentWillReceiveProps(nextProps) {
    const accounts = this._extractAccounts(nextProps);
    if( (this.props.wapii.accounts || []).length !== accounts.length ){
      this.props.actions.updateAccounts(accounts);
    }
    APIUtils.plugin.setBlockchain(nextProps.blockchain);
  } 
}

const mapStateToProps = (state) => {
  return {
    account: state.settings.account,
    keys: state.keys,
    wallets: state.wallets,
    wapii: state.wapii,
    blockchain: state.settings.blockchain
  };
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators({
      ...WAPII_ACCOUNT_ACTIONS,
      ...WAPII_AUTH_APPS_ACTIONS,
      ...WAPII_IDENTITY_ACTIONS,
      ...WAPII_KEYPROVIDER_ACTIONS,
      ...WAPII_PERMISSIONS_ACTIONS,
      useWallet
    }, dispatch)
  };
}


export default connect(mapStateToProps, mapDispatchToProps)(APIIntegration);
