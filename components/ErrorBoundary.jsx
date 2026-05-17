// components/ErrorBoundary.jsx
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={hasError:false,error:null};}
  static getDerivedStateFromError(error){return{hasError:true,error};}
  componentDidCatch(error,info){
    console.error(JSON.stringify({tag:'[ERROR BOUNDARY]',label:this.props.label||'Component',message:error?.message,stack:error?.stack,componentStack:info?.componentStack}));
  }
  handleReset=()=>this.setState({hasError:false,error:null});
  render(){
    if(!this.state.hasError) return this.props.children;
    if(this.props.fallback) return this.props.fallback;
    const label=this.props.label||'ส่วนนี้';
    return(
      <div style={{padding:'2rem',textAlign:'center',background:'rgba(255,255,255,0.04)',borderRadius:'12px',border:'1px solid rgba(255,255,255,0.08)',color:'#ccc'}}>
        <p style={{marginBottom:'0.5rem',fontSize:'1.1rem'}}>⚠️ {label} เกิดข้อผิดพลาด</p>
        <p style={{fontSize:'0.85rem',opacity:0.6,marginBottom:'1rem'}}>{this.state.error?.message||'Unknown error'}</p>
        <button onClick={this.handleReset} style={{padding:'0.4rem 1.2rem',borderRadius:'6px',border:'1px solid rgba(255,255,255,0.2)',background:'transparent',color:'#fff',cursor:'pointer',fontSize:'0.85rem'}}>ลองใหม่</button>
      </div>
    );
  }
}
