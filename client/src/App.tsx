import './App.css';

import {
  useExamWebSocket
} from './websocket/useExamWebSocket';


function App(){
  const {status, lastMessage, sendMessage} = useExamWebSocket();

  const handlePing = () =>{
    const requestId = sendMessage('PING', {clientTime: new Date().toISOString()});

    if (requestId === null){
      console.warn('Cannot send PING because WebSocket is not connected.');
      return;
    }
    console.log('PING sent, requestId:', requestId);
  };

  return (
    <main className="app">

      <section className="connection-card">
        <h1>Online Examination System</h1>
        <p>
          React client communicates with the Java server
        through a persistent WebSocket connection.
        </p>
        <div className="connection-status">
          <span>Status:</span>
          <strong>{status}</strong>
        </div>

        <button
        type="button" onClick={handlePing} disabled={status !== 'connected'}>
          Send PING
        </button>

        {lastMessage !== null && (
          <section className='server-message'>
            <strong>Server event:</strong>
            <h2>Latest server message</h2>
            
            <p>
              <strong>Type:</strong>{' '}
              {lastMessage.type}
            </p>

            {lastMessage.requestId && (
              <p>
                <strong>Request ID:</strong>{' '}
                {lastMessage.requestId}
              </p>
            )}

            {lastMessage.data?.message && (
              <p>
                <strong>Message:</strong>{' '}
                {lastMessage.data.message}
              </p>
            )}

            {lastMessage.data?.serverTime && (
              <p>
                <strong>Server time:</strong>{' '}
                {lastMessage.data.serverTime}
              </p>
            )}

            {lastMessage.error && (
              <p>
                <strong>
                  {lastMessage.error.code}:
                </strong>{' '}
                {lastMessage.error.message}
              </p>
            )}
          </section>
        )}
      </section>
    </main>
  );
}

export default App;