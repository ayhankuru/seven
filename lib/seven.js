'use strict'

/**!
 * Seven
 * @author Ayhankuru   <cobaimelan@protonmail.ch>
 * @license MIT
 */

import  Debug  from  'debug';
import  failingLine from 'failing-line';
import  objectAssign from 'object-assign';
import  prettifyError from '@cobaimelan/prettify-error';
import  format from 'format-text';
import  ejs from 'ejs';
import  SlackBot  from  'slackbots';
import  nodemailer  from  'nodemailer';
import  PushBullet  from  'pushbullet';
import  fs  from  'fs';
import  _, { find,pick,keys,indexOf,throttle,where,remove } from 'lodash';
import  everytime from 'every-time';
import  englishtime from 'english-time';
import  { EventEmitter } from 'events';
import  uid from 'uid';

const debug = Debug('seven');
const Edebug = Debug('seven:email');
const Sdebug = Debug('seven:slack');
const Pdebug = Debug('seven:pushbullet');

/**
 * @class
 * @desc Seven class
 * @public
 */
export default class Seven extends EventEmitter{
  /**
   * @constructs
   * @method constructor
   * @param {object} config - {appname:"whiterabbit"}
   * @desc  Create new seven app
   */
  constructor(config={}) {
    super();
    debug(`initialize class`)
    this.conf = config;
    this._sevendb = [];
    this._execute();
  }

  /**
   * @method _execute
   * @desc execute all config function
   * @private
   */

  _execute(){


      // ayarlar yok ise dosyayı kontrol et ayarları yükle
      if(_.keys(this.conf).length == 0  && this._getConfig()){
        let xconf = require(`${process.cwd()}/seven.conf.js`);

        if(typeof xconf.timeout == 'undefined' ){
          xconf.timeout = englishtime('2 minute');
        }else{
          if(typeof xconf.timeout == 'string'){
              xconf.timeout = englishtime(xconf.timeout);
          }
        }


        this.conf = xconf;
        debug(`ayarlar alındı`);
      }


      if(this.conf.email && this.conf.email.transport){
        this._mailler =  nodemailer.createTransport(this.conf.email.transport);
        //debug(`email aktif`);
      }

      if(this.conf.slack && this.conf.slack.apikey){
        this._slack = new SlackBot({ token: this.conf.slack.apikey, name: 'Seven'});
        //debug(`slack aktif`)
      }

      if(this.conf.pushbullet && this.conf.pushbullet.apikey){
        this._pushBullet =  new PushBullet(this.conf.pushbullet.apikey);
        //debug(`pushbullet aktif`)
      }

      if(process.env.seven || process.env.SEVEN &&
        process.env.seven == "active" || process.env.SEVEN == "active"
        ){
        this._watchErr();
      }

      // listening actions
      this._action();

      // execute job
      this._cronJob();

      // execute flushdb
      this._flushDb();
  }

  /**
   * @method _action
   * @desc all actions listening
   * @private
   */
  _action(){

    this.on('new:error',_.throttle((err)=>{

      if(typeof this.conf.email.cron == 'undefined'){
          debug('email action started')
            this._sendMail(err);
      }

      if(typeof this.conf.slack.cron == 'undefined'){
        debug('slack action started')
          this._slackMessage(err);
      }

      if(typeof this.conf.pushbullet.cron  == 'undefined'){
        debug('pushbullet action started');
        this._pushbulletMessage(err);
      }

    },this.conf.timeout));

  }

  /**
   * @method _flushDb
   * @desc
   * @private
   */

   _flushDb(){

      everytime('1 hour', ()=>{

        let ids = _.pluck(_.where(this._sevendb,{slack:true,send:true,bullet:true}),'id');

        this._sevendb = _.remove(this._sevendb, function(item) {
          return _.indexOf(ids,item.id) == 0;
        });


        console.log(this._sevendb);

      });

   }


  /**
   * @method _cronJob
   * @desc
   * @private
   */
   _cronJob(){

     debug('cron beklemede')

     if(typeof this.conf.email.cron !== 'undefined'){
       if(typeof this.conf.email.cron == 'string'){

        everytime(this.conf.email.cron, ()=>{


          let errors = _.where(this._sevendb,{send: false});

            if(typeof errors !== 'undefined' && errors.length > 0  ){

              errors.forEach(_.throttle((err)=>{
                this._sendMail(err);
                this._sevendb = objectAssign(this._sevendb,objectAssign(err,{send:true}));
              },this.conf.timeout));

            }

        })

       }
     }


     if(typeof this.conf.slack.cron !== 'undefined'){
       if(typeof this.conf.slack.cron == 'string'){

        everytime(this.conf.slack.cron, ()=>{


          let errors = _.where(this._sevendb,{slack: false});

            if(typeof errors !== 'undefined' && errors.length > 0  ){

              errors.forEach(_.throttle((err)=>{
                this._slackMessage(err);
                this._sevendb = objectAssign(this._sevendb,objectAssign(err,{slack:true}));
              },this.conf.timeout));

            }

        })

       }
     }


     if( this.conf.pushbullet.cron !== 'undefined'){

         if(typeof this.conf.pushbullet.cron == 'string'){

           everytime(this.conf.pushbullet.cron, ()=>{


             let errors = _.where(this._sevendb,{bullet: false});

               if(typeof errors !== 'undefined' && errors.length > 0  ){

                 errors.forEach(_.throttle((err)=>{
                   this._pushbulletMessage(err);
                   this._sevendb = objectAssign(this._sevendb,objectAssign(err,{bullet:true}));
                 },this.conf.timeout));

               }

           })

         }

     }

   }

  /**
   * @method _pushbulletMessage
   * @desc pusbullet info
   * @param {object} - error
   * @private
   */

  _pushbulletMessage(error){

    (() =>{
      return new Promise((resolve,reject)=>{
        this._pushBullet.devices((perror, response) =>{
          if(perror){
            reject(perror);
          }else {
            Pdebug(`pushbullet'e deviceları aranıyor...`)
          resolve(response.devices.filter((device) =>{
            return _.indexOf(this.conf.pushbullet.devices,device.nickname) == 0;
          }));
          }
        });
      });
    })().then((devices) => {
      devices.forEach((device)=>{

      var extrap = objectAssign(error,{appname:this.conf.appname},this.conf.template.params);

      var message = format(this.conf.pushbullet.message || `test mesaj`,extrap);
          message = `${message}  -  ${error.name} `;

        this._pushBullet.note(device.iden, `Seven`, message,(perror,response)=>{
          Pdebug(`${device.nickname}'ına mesaj gönderildi. `);
        });

      });
    }).catch((err) => {
      console.log(err);
    });


  }

  /**
   * @method _slackMessage
   * @desc slack bot
   * @param {object} - error
   * @private
   */

  _slackMessage(error){


    debug(`slack'a mesaj gönderiliyor...`)

    var extrap = objectAssign(error,{appname:this.conf.appname},this.conf.template.params);

    var message = format(this.conf.slack.message || `uygulamada xxx`,extrap);
        message = `${message}  -  ${error.name} `;

    if(this.conf.slack.channels && this.conf.slack.channels.length > 0){
      this.conf.slack.channels.forEach((channel)=>{
        this._slack.postMessageToChannel(channel, message);
        Sdebug(`${channel}'ına mesaj gönderildi. `);
      });
    }


    if(this.conf.slack.users && this.conf.slack.users.length > 0){
      this.conf.slack.users.forEach((user)=>{
        this._slack.postMessageToUser(user, message);
        Sdebug(`${user}'ına mesaj gönderildi. `);
      });
    }

    if(this.conf.slack.groups && this.conf.slack.groups.length > 0){
      this.conf.slack.groups.forEach((group)=>{
        this._slack.postMessageToGroup(group, message);
        Sdebug(`${group}'a mesaj gönderildi. `);
      });
    }

  }

  /**
   * @method _sendMail
   * @desc send email
   * @param {object} - error
   * @private
   */
  _sendMail(error){

    var extrap = objectAssign(error,{appname:this.conf.appname},this.conf.template.params);
    if(!error.send){

      Edebug(`Email gönderiliyor...`)
      var error_body = this._template(error);

      if(error_body !== false){
        var body = {
            from: format(this.conf.email.sender || `{appname}  <johndoe@gmail.com>`,extrap),
            to: this.conf.email.list.join(','),
            subject: format(error.title,extrap),
            html:error_body
           };

        this._mailler.sendMail(body,(xerror,info)=>{
          if(xerror){
              console.log(xerror);
          }
          let list = this.conf.email.list.join(',');
          Edebug(`${list} adreslerine email gönderildi `);
          Edebug(`Email sent: ${info.response} `);
        });

      }else{
        console.error('template not working!');
      }

    }

  }

  /**
   * @method _getConfig
   * @desc check config file exists
   * @return {boolean} - true or false
   * @private
   */
  _getConfig() {
    debug(`searching config file`)
    try {
      fs.statSync(`${process.cwd()}/seven.conf.js`);
      return true;
    } catch (err) {
       if (err.code === 'ENOENT') return false;
    }
  }

  /**
   * @method error
   * @desc check config file exists
   * @param {function} err - Error
   * @param {object} exta - {userid:124, log:'xxx'};
   * @public
   */
  error(err,extra={}){
    if(!_.find(this._sevendb,{name:err.message})){

      debug(`new error added`)
      if( typeof prettifyError(err) == 'undefined'){
        let xx = this._stack();
        let filename = xx[0].filename;
        let countf = filename.split('/').length;
        if(countf >= 5 ) filename = filename.split('/').slice(3,countf).join('/');

        let readData = fs.readFileSync(xx[0].filename,'utf8').toString().split("\n");
        let code = [readData[xx[0].line-2],readData[xx[0].line-1] ,readData[xx[0].line]];
        let fakestack = xx.map((frame)=>{
          return `at ${frame.name}. (${frame.filename}:${frame.line})`;
        }).join('<br/>');

        let body =`
        <b><span style="color:red">${err.name}</span> <span style="color:grey">${filename}</span> </b><br>
        <span style="color:red">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;v</span><br>
        <span style="color:grey">${xx[0].line-2}: ${code[0]} </span><br>
        <span style="color:black"><b>${xx[0].line-1}: ${code[1]}</b></span><br>
        <span style="color:grey">${xx[0].line-0}: ${code[2]}</span><br>
        <span style="color:red">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;^</span><br>
        <span style="color:grey">${err.message}<br/>
        ${fakestack}
        </span>
        `

        var dump_err = objectAssign({body:body,fn:xx[0].name,line:xx[0].line,col:0,filename:xx[0].filename},{name:err.message},{send:false},{old:err},{extra:extra});

      }else{
        let body = prettifyError(err,{
          white:'<span style="color:black"><b>',
          whiteC:'</b></span>',
        });

        var dump_err = objectAssign(failingLine(err),
        {name:err.message},
        {body:body},
        {old:err},
        {extra:extra},
        {send:true,
        slack:true,
        bullet:true,
        id:uid(8)});

        if(typeof this.conf.email.cron !== 'undefined' ) dump_err.send = false;
        if(typeof this.conf.slack.cron !== 'undefined' ) dump_err.slack = false;
        if(typeof this.conf.pushbullet.cron !== 'undefined' ) dump_err.bullet = false;
      }


      this._sevendb.push(dump_err);
      //this.emit('new:error',dump_err);

    }

  }

  /**
   * @method _template
   * @desc render mail template
   * @param {object} err - {appname:'xx'}
   * @return {string} <html> - html template
   * @private
   */
  _template(error){
    debug(`render new mail template`);
    if(this.conf.template.path == null){
      var template_path = `${__dirname}/layout.tmp`;
    }else{
      var template_path = this.conf.template.path;
    }

    let xeror = _.pick(error,'name','body','fn','line','col','filename','extra')

    if(this.conf.appname){
      xeror.appname = this.conf.appname;
    }

    if(!this.conf.template.title) {
      xeror.title = `Seven found error : ${xeror.name}`;
    }


    let extrap = this._injectparams(xeror);

    var params = objectAssign(xeror,extrap,xeror.extra);

    try {
      return ejs.compile(fs.readFileSync(template_path,'utf8'))(params);
    } catch (e) {
      console.error(e.stack);
      return false;
    }

  }

  /**
   * @method _injectparams
   * @desc extra params inject parameters
   * @param {object} err - {name:'xx',line:'xx'}
   * @return {object} new object
   * @private
   */
  _injectparams(params){

      if(this.conf.template && this.conf.template.params){
        let extraparams = this.conf.template.params;
        _.keys(extraparams).forEach(function(key){
          extraparams[key] = format(extraparams[key],params);
        });

        return extraparams;

      }else{
        return {}
      }
  }

  /**
   * @method _watchErr
   * @desc watch nodejs error
   * @private
   */
  _watchErr(){
    process.on('uncaughtException', (error)=>{
      this.error(error);
    });
  }

  /**
   * @method _stack
   * @desc fake error stack
   * @return {object} new object
   * @private
   */
  _stack(){
     let fakeError = new Error;

      Error.prepareStackTrace = function (err, stack) {
        return stack;
      };

      Error.captureStackTrace(fakeError, this.error);


      return fakeError.stack.map((frame)=>{
        return {filename:frame.getFileName(),
         line: frame.getLineNumber(),
         name :frame.getFunctionName()}
      })
  }

}
