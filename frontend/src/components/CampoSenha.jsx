// src/components/CampoSenha.jsx
import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./ui/Campo";

// Campo de senha com botão para mostrar/ocultar
export default function CampoSenha(props) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visivel ? "text" : "password"} className="pr-10" />
      <button
        type="button"
        onClick={() => setVisivel(!visivel)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-aco hover:text-marinho"
        aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
      >
        {visivel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
