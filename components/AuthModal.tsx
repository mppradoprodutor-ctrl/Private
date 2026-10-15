import React, { useState } from 'react';
import { X, Mail, Lock, LogIn, UserPlus, Shield, Eye, EyeOff } from 'lucide-react';
import { auth } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      onSuccess(userCredential.user.email || 'Conta Google');
      onClose();
    } catch (err: any) {
      console.error(err);
      setError('Erro ao autenticar com o Google. Verifique se o login do Google está disponível.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        onSuccess(userCredential.user.email || email);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onSuccess(userCredential.user.email || email);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      let errMsg = 'Erro ao autenticar. Tente novamente.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errMsg = 'E-mail ou senha incorretos.';
      } else if (err.code === 'auth/invalid-credential') {
        errMsg = 'Credenciais inválidas. Verifique seu e-mail e senha.';
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = 'Este e-mail já está em uso.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'A senha deve conter no mínimo 6 caracteres.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Formato de e-mail inválido.';
      } else if (err.code === 'auth/operation-not-allowed') {
        errMsg = 'O cadastro por E-mail/Senha não está ativado no Firebase Console para este projeto. Por favor, utilize o botão "Entrar com o Google" abaixo ou ative o provedor "E-mail/Senha" no seu console Firebase.';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-8 flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute right-6 top-6 p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-red-700 hover:bg-red-50 transition-all"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 mb-4">
            <Shield size={24} />
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
            {isRegister ? 'Criar Conta em Nuvem' : 'Acessar Conta em Nuvem'}
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {isRegister 
              ? 'Sincronize seus dados para trabalhar de qualquer dispositivo' 
              : 'Trabalhe em tempo real de qualquer computador'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-100 text-red-900 rounded-xl text-xs font-bold leading-relaxed">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-red-100 placeholder-slate-300"
                placeholder="exemplo@empresa.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type={showPassword ? 'text' : 'password'} 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-10 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-red-100 placeholder-slate-300"
                placeholder="******"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-red-700 text-white py-3.5 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-red-700/20 hover:bg-red-800 transition-all flex items-center justify-center gap-2 disabled:bg-red-300"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : isRegister ? (
              <>
                <UserPlus size={14} /> Cadastrar e Sincronizar
              </>
            ) : (
              <>
                <LogIn size={14} /> Entrar e Sincronizar
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-slate-100"></div>
          <span className="flex-shrink mx-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">Ou</span>
          <div className="flex-grow border-t border-slate-100"></div>
        </div>

        {/* Google Sign-In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-white border border-slate-200 text-slate-700 py-3.5 rounded-xl font-bold text-xs hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          Entrar com o Google
        </button>

        {/* Preview Sandbox / Iframe notice */}
        <div className="mt-4 p-3 bg-amber-50/60 border border-amber-100/80 rounded-2xl text-center">
          <p className="text-[10px] font-bold text-amber-800 leading-normal">
            💡 Se o login falhar ou não abrir, abra o aplicativo em uma <span className="underline">nova aba</span> (ícone no topo superior direito da tela) para evitar bloqueios de segurança do navegador.
          </p>
        </div>

        {/* Footer switch */}
        <div className="mt-6 text-center border-t border-slate-50 pt-4">
          <button 
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-[10px] font-black text-red-700 hover:text-red-800 uppercase tracking-widest transition-colors"
          >
            {isRegister 
              ? 'Já tem uma conta em nuvem? Entrar' 
              : 'Não tem uma conta em nuvem? Cadastrar-se'}
          </button>
        </div>

      </div>
    </div>
  );
};
