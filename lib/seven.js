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
  constructor(config={}) {
    super();
    debug(`initialize class`)
    this._errorDump = [];
    this.conf = config;
    this._execute();

  }

  /**
   * @method _execute
   * @desc execute all config function
   * @private
   */

  _execute(){

      if(process.env.seven || process.env.SEVEN &&
        process.env.seven == "active" || process.env.SEVEN == "active"
        ){
        this._watchErr();
      }

      if(this._getConfig()){
        let xconf = require(`${process.cwd()}/seven.conf.js`);
        this.conf = xconf;
        if(this.conf.email.transport){
          this._mailler =  nodemailer.createTransport(this.conf.email.transport);
        }
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

  /**
   * @method _sendMail
   * @desc send email
   * @param {object} - error
   * @private
   */
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

        //console.log(body.html);

        this._mailler.sendMail(body, function(error, info){
            if(error){
                console.log(error);
            }
            debug('Message sent: ' + info.response);
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
    debug(`new error added`)
    if(!find(this._errorDump,{name:err.message})){


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

        var dump_err = objectAssign(failingLine(err),{name:err.message},{body:body},{send:false},{old:err},{extra:extra});

      }


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

    let xeror = pick(error,'name','body','fn','line','col','filename','extra')

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
        keys(extraparams).forEach(function(key){
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
