"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';

interface AppContextType {
  user: any;
  setUser: (u: any) => void;
  toast: (msg: string) => void;
  modalOpen: boolean;
  modalTitle: string;
  modalBody: React.ReactNode;
  modalWidth: number | string | undefined;
  openModal: (title: string, body: React.ReactNode, width?: number | string) => void;
  closeModal: () => void;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalBody, setModalBody] = useState<React.ReactNode>(null);
  const [modalWidth, setModalWidth] = useState<number | string | undefined>(undefined);

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setUser(data.user);
        }
      })
      .catch(console.error);
  }, []);

  const toast = useCallback((msg: string) => {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout((window as any)._tt);
    (window as any)._tt = setTimeout(() => t!.classList.remove('show'), 2800);
  }, []);

  const openModal = useCallback((title: string, body: React.ReactNode, width?: number | string) => {
    setModalTitle(title);
    setModalBody(body);
    setModalWidth(width);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalBody(null);
    setModalWidth(undefined);
  }, []);

  return (
    <AppContext.Provider value={{ user, setUser, toast, modalOpen, modalTitle, modalBody, modalWidth, openModal, closeModal }}>
      {children}
      {/* Global Modal */}
      <div className={`modal-bg ${modalOpen ? 'on' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
        <div className="modal" style={{ maxWidth: modalWidth, width: modalWidth ? '100%' : undefined }}>
          <div className="m-hdr">
            <div className="m-title">{modalTitle}</div>
            <button className="m-close" onClick={closeModal}>✕</button>
          </div>
          <div>{modalBody}</div>
        </div>
      </div>
      {/* Toast */}
      <div id="toast"></div>
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);









// Add this button in 
// import {ButtonGroup, Button} from '@shopify/polaris';
// import React from 'react';

// function ButtonGroupExample() {
//   return (
//     <ButtonGroup variant="segmented">
//       <Button>Bold</Button>
//       <Button>Italic</Button>
//       <Button>Underline</Button>
//     </ButtonGroup>
//   );
// }
// in header logout 


