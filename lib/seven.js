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
import  moment from 'moment';
import  nodemailer  from  'nodemailer';
import  fs  from  'fs';
import { find,pick,keys,map } from 'lodash';
import jobs from 'simple-jobs';
import englishTime from 'english-time';
import { EventEmitter } from 'events';
const debug = Debug('seven');


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
  constructor(config) {
    super();
    debug(`initialize class`)
    this._errorDump = [];
    this.conf = config || {};
    this._execute();

  }

  /**
   * @method _execute
   * @desc execute all config function
   * @private
   */

  _execute(){

      if(this._getConfig()){
        let xconf = require(`${process.cwd()}/seven.conf.js`);
        this.conf = xconf;
        this._mailler =  nodemailer.createTransport(this.conf.email.transport);
      }

      this.on('new:error',(err) =>{
        if(!this.conf.email.cron.time){
          debug('Email gönderme aktif');
          this._sendMail(err);
        }else{
          debug('Cron aktif daha sonra ');
        }

      });

      debug(`execute all config function`)
  }

  _sendMail(error){

    var extrap = objectAssign(error,{appname:this.conf.appname},this.conf.template.params);
    if(!error.send){

      var error_body = this._template(error);

      if(error_body !== false){
        var body = {
            from: format(this.conf.email.sender,extrap),
            to: this.conf.email.list.join(','),
            subject: format(error.title,extrap),
            html:error_body
           };
 

        //this._mailler.sendMail(body, function(error, info){
        //    if(error){
        //        console.log(error);
        //    }
        //    debug('Message sent: ' + info.response);
        //});

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
  error(err,extra){
    debug(`new error added`)
    if(!find(this._errorDump,{name:err.message})){
      let dump_err = objectAssign(failingLine(err),{name:err.message},{send:false},{old:err},{extra:extra});
      this._errorDump.push(dump_err);
      this.emit('new:error',dump_err);
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

    let xeror = pick(error,'name','body','fn','line','col','filename','extra');
    let countf = xeror.filename.split('/').length;
    if(countf >= 5 ) xeror.filename = xeror.filename.split('/').slice(3,countf).join('/');

    if(this.conf.appname){
      xeror.appname = this.conf.appname;
    }

    if(!this.conf.template.title) {
      xeror.title = `Seven found error : ${xeror.name}`;
    }


    xeror.body = prettifyError(error.old,{
      white:'<span style="color:black"><b>',
      whiteC:'</b></span>',
    });

    let extrap = this._injectparams(xeror);

    let params = objectAssign(xeror,extrap,xeror.extra);


    try {
      return format(fs.readFileSync(template_path,'utf8'),params );
    } catch (e) {
      return false;
    }

  }

  _injectparams(obj){

      if(this.conf.template && this.conf.template.params){
        let extraparams = this.conf.template.params;
        keys(extraparams).forEach(function(key){
          extraparams[key] = format(extraparams[key],obj);
        });

        return extraparams;

      }else{
        return {}
      }
  }

}
