const yo = require('yo-yo')
const CITA = require('@cryptape/cita-sdk').default
const defaultSets = {
  chain: 'https://node.citahub.com',
  chainId: 1,
  privateKey: '',
  quotaLimit: 53000,
  value: 0,
  version: 2,
}

let tx = {}
const els = {}

const storeAbiElId = 'store-abi-on-chain'
const autoBlockNumberElId = 'auto-valid-until-block'
const cita = CITA(defaultSets.chain)
const microscope = `://microscope.cryptape.com`

const css = require('./styles/run-tab-styles')

const ids = {
  chainAddress: 'chainAddress',
  chainId: 'chainId',
  privateKey: 'privateKey',
  quotaLimit: 'quotaLimit',
  citaValue: 'citaValue',
  validUntilBlock: 'validUntilBlock',
  citaVersion: 'citaVersion'
}

const contractsPanelId = 'cita-contracts'
const contractInterfaceId = 'contract-interface'
window.onload = () => {
  const logPanel = document.querySelector("[class^=journal]")
  const log = {
    el: (el) => {
      logPanel.appendChild(el)
    },
    table: (target) => {
      let el = document.createElement('div')
      el.setAttribute('class', css.block)
      if (typeof target === 'string') {
        console.log(target)
        el.innerText = target
      } else {
        let header = ''
        let data = ''
        console.table(target)
        if (Array.isArray(target)) {
          header = `<th>Index</t><th>Value</th>`
          data = target.map((elm, idx) => `<tr style="background-color: ${idx % 2 ? '#dedbdb' :'#e8e8e8'}"><td>${idx}</td><td>${elm.toString()}</td></tr>`).join('')
        } else {
          header = `<th>Key</th><th>Value</th>`
          data = Object.keys(target).map((key, idx) => {
            return `<tr style="background-color: ${idx % 2 ? '#dedbdb' :'#e8e8e8'}"><td>${key}:</td><td>${target[key]}</td></tr>`
          }).join('')
        }
        el.innerHTML = `
          <table style="width: 100%; text-align: left; border-collapse: collapse;">
            <thead style="text-align: left">
              <tr style="font-weight: 900; color: #000;">
                ${header}
              </tr>
            </thead>
            <tbody>
              ${data}
            </tbody>
          </table>
          <hr />
        `
      }
      el.style = "margin-top: 2ch; padding: 1ch"
      logPanel.appendChild(el)
    },
    error: (error) => {
      const el = document.createElement('div')
      el.setAttribute('class', css.block)
      el.style = 'margin-top: 2ch; padding: 1ch; color: red;'
      el.innerHTML = error.toString()
      logPanel.appendChild(el)
    }
  }
  window.logPanel = logPanel
  window.log = log
}


/**
 * @function useCtrConstructorWith
 */
const useCtrConstructorWith = (cb) => {
  const constructor = window.remix.cita.contracts.selected.props.abi.filter(abi => abi.type === 'constructor')[0]
  if (constructor) {
    return cb(constructor)
  } else {
    window.console.warn("No Constructor Found")
    return cb(null)
  }
}

// append constructor params fieds on panel
const appendParamInputs = (constructor) => {
  if (!constructor) return
  const inputs = constructor.inputs.map(input => {
    return `
        <div style="display:flex; margin: 8px 0;">
          <label for="cita-constructor-${input.name}" style="flex-basis: 100px; text-align: right; padding-right: 15px;">${input.name}:</label>
          <input
            class="${css.col2}"
            style="flex: 1;"
            id="cita-constructor-${input.name}"
            placeholder="${input.type}"
          />
        </div>
      `
  })
  document.getElementById(contractInterfaceId).innerHTML = inputs.join('')
}

// return constructor fields value
const readConstructorInputs = (constructor) => constructor ? constructor.inputs.map(input => {
  return document.getElementById(`cita-constructor-${input.name}`).value
}) : []

const handleTxResult = (txRes) => {
  log.table('Transaction Result')
  log.table(txRes)
  if (txRes.hash) {
    cita.listeners.listenToTransactionReceipt(txRes.hash).then(receipt => {
      log.table('Transaction Receipt')
      log.table(receipt)
      if (!receipt.contractAddress) return
      const microscopeLinks = {
        transaction: `<a target="_blank" href="${els.chainAddress.split(':')[0]}${microscope}?chain=${els.chainAddress}/#/transaction/${receipt.transactionHash}">${receipt.transactionHash}</a>`,
        contract: `<a target="_blank" href="${els.chainAddress.split(':')[0]}${microscope}?chain=${els.chainAddress}/#/account/${receipt.contractAddress}">${receipt.contractAddress}</a>`
      }
      if (document.getElementById(storeAbiElId).checked) {
        log.table("Storing ABI")
        // store abi
        return cita.base.storeAbi(receipt.contractAddress, window.remix.cita.contracts.selected.props.abi,
          Object.assign({}, tx, {
            value: '0',
            data: '',
            privateKey: els.privateKey,
          })
        ).then(receipt => {
          if (receipt.errorMessage) {
            throw new Error(receipt.errorMessage)
          } else {
            log.table('Get more detail at Microscope')
            log.table("ABI stored")
          }
        }).catch(err => log.error(err.toString())).then(() => {
          log.table(microscopeLinks)
        })
      } else {
        log.table('Get more detail at Microscope')
        log.table(microscopeLinks)
      }
    })
  }
}

/**
 * @function sendToCITA
 * @desc send Tx to CITA
 */
window.sendToCITA = () => {
  if (!window.remix.cita.contracts.selected) {
    log.error("Load and select contract first")
    return new Error("Load and select contract first")
  }
  // get transaction fields
  Object.keys(ids).map(id => {
    els[id] = document.getElementById(id).value
  })
  // get constructor params
  const _arguments = useCtrConstructorWith(readConstructorInputs)

  log.table('Els')
  log.table(els)
  log.table('Arguments')
  log.table(_arguments)

  if (!els.chainAddress) {
    log.error('Chain Address Required')
    return new Error("Chain Address Required")
  } else {
    cita.currentProvider.host = els.chainAddress
  }
  log.table(`Chain Address: ${cita.currentProvider.host}`)
  if (!els.privateKey) {
    log.error("Private Key Required")
    return new Error("Private Key Required")
  }

  const account = cita.base.accounts.privateKeyToAccount(els.privateKey)

  tx = {
    privateKey: els.privateKey,
    from: account.address.toLowerCase(),
    nonce: Math.random().toString(),
    quota: +els.quotaLimit,
    chainId: els.chainId,
    version: +els.citaVersion,
    validUntilBlock: +els.validUntilBlock,
    value: els.citaValue,
  }
  const myContract = new cita.base.Contract(window.remix.cita.contracts.selected.props.abi)
  const {
    selected
  } = window.remix.cita.contracts

  if (document.getElementById("auto-valid-until-block").checked) {
    cita.base.getBlockNumber().then(blockNumber => {
      tx.validUntilBlock = +blockNumber + 88
      document.getElementById(ids.validUntilBlock).value = tx.validUntilBlock
      log.table('Block Height')
      log.table({
        currentNumber: blockNumber,
        validUntilBlock: +blockNumber + 88,
      })
      log.table('Transaction')
      log.table(tx)
      return myContract.deploy({
        data: selected.props.evm.bytecode.object,
        arguments: _arguments,
      }).send(tx).then(handleTxResult).catch(log.error)
    })
  } else {
    log.table('Transaction')
    log.table(tx)
    return myContract.deploy({
      data: selected.props.evm.bytecode.object,
      arguments: _arguments,
    }).send(tx).then(handleTxResult).catch(log.error)
  }
}


/**
 * @function loadConstructParams
 */
const loadConstructParams = () => {
  const ctrName = window.remix.cita.contracts.selected
  if (!ctrName) return
  useCtrConstructorWith(appendParamInputs)
}

/**
 * @function setSelectedContract
 */
const setSelectedContract = (name) => {
  window.remix.cita.contracts.selected = {
    name,
    props: window.remix.cita.contracts.loaded[name]
  }
  loadConstructParams()
}

const optionGen = (ctrName, ctr) =>
  `<option id=${ctrName} title=${ctrName} value=${ctrName}>${ctrName}</option>`

/**
 * @function appendContractsToCITAPanel
 * @desc append loaded contracts to cita panel
 */
const appendContractsToCITAPanel = contracts => {
  const contractPanel = document.getElementById(contractsPanelId)
  if (!contracts) {
    contractPanel.innerHTML = 'No Contracts Loaded Yet'
  }
  if (contracts) {
    const ctrs = {}
    for (let file in contracts) {
      for (let c in contracts[file]) {
        Object.defineProperty(ctrs, c, {
          value: contracts[file][c],
          enumerable: true,
        })
      }
    }
    window.remix.cita.contracts.loaded = ctrs
    const options = `
    <label for="selectCtrOptions" style="min-width: 150px; padding-right: 15px; text-align: right;">Contracts:</label>
    <select id="selectCtrOptions" class="${css.select}">
      ${Object.keys(ctrs)
        .map(ctrName => optionGen(ctrName, ctrs[ctrName]))
        .join()}
    </select>
    `
    contractPanel.innerHTML = options

    // set selected contract and add event listener
    const selectEl = window.document.getElementById("selectCtrOptions")
    setSelectedContract(selectEl.value)
    selectEl.addEventListener('change', function () {
      setSelectedContract(this.value)
    })
  }
}

/**
 * @function loadContracts
 * @desc load compiled contracts
 */
window.loadContracts = () => {
  const contracts = window.udapp._deps.compiler.getContracts()
  appendContractsToCITAPanel(contracts)
}

const chainAddressEl = yo `
    <div class="${css.crow}">
      <div class="${css.col1_1}">Chain Address</div>
      <input type="text"
        class="${css.col2}"
        id=${ids.chainAddress}
        value=${defaultSets.chain}
      />
    </div>
  `
const chainIdEl = yo `
    <div class="${css.crow}">
      <div class="${css.col1_1}">Chain ID</div>
      <input type="text"
      class="${css.col2}"
      id=${ids.chainId}
      value=${defaultSets.chainId} >
    </div>
  `
const versionEl = yo `
  <div class="${css.crow}">
    <div class="${css.col1_1}">Version</div>
    <input type="text"
    class="${css.col2}"
    id=${ids.citaVersion}
    value=${defaultSets.version} >
  </div>
`
const privateKeyEl = yo `
    <div class="${css.crow}">
      <div class="${css.col1_1}">Private Key</div>
      <input type="text"
      class="${css.col2}"
      id=${ids.privateKey}
      value=${defaultSets.privateKey} >
    </div>
  `
const quotaLimitEl = yo `
    <div class="${css.crow}">
      <div class="${css.col1_1}">Quota Limit</div>
      <input type="text"
        class="${css.col2}"
        id=${ids.quotaLimit}
        value=${defaultSets.quotaLimit}
        title="Enter the quota"
        placeholder="Enter the quota"
      >
    </div>
  `
const citaValueEl = yo `
    <div class="${css.crow}">
      <div class="${css.col1_1}">Value</div>
      <input
        type="text"
        class="${css.col2}"
        id=${ids.citaValue}
        value=${defaultSets.value}
        title="Enter the value"
        placeholder="Enter the value"
      k>
    </div>
  `
const validUntilBlockEl = yo `
    <div class="${css.crow}">
      <div class="${css.col1_1}">Valid Until Block</div>
      <input
        type="text"
        class="${css.col2}"
        id=${ids.validUntilBlock}
        value=""
        title="Enter the validUntilBlock"
        placeholder="Enter the validUntilBlock"
      >
      <div>
        <input type="checkbox" id=${autoBlockNumberElId} checked /> Auto
      </div>
    </div>
  `

const storeAbiEl = yo `
  <div>
    <input type="checkbox" id=${storeAbiElId} checked /> Store ABI on chain
  </div>
`

const btnStyle = `
  background: hsla(0, 82%, 82%, .5);
  border: 1px solid hsla(0, 82%, 82%, .5);
  color: #000;
  font-size: 10px;
  overflow: hidden;
  display:flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  text-decoration: none;
  min-height: 25px;
  margin: 8px 0;
`
const submitBtn = yo `
    <a
      href="javascript:window.sendToCITA()"
      style="${btnStyle}"
    >
      Deploy to CITA
    </a>
  `

const loadContractBtn = yo `
  <a
    href="javascript:window.loadContracts()"
    style="${btnStyle}"
  >Load Contracts</a>
`
const citaEl = yo `
  <div>
    <div class="${css.settings}">
      <h5>CITA</h5>
      ${chainAddressEl}
      ${chainIdEl}
      ${versionEl}
      ${privateKeyEl}
      ${quotaLimitEl}
      ${citaValueEl}
      ${validUntilBlockEl}
      ${storeAbiEl}
      <div>
      ${loadContractBtn}
      </div>
      <div id=${contractsPanelId}></div>
      <div id=${contractInterfaceId}></div>
      ${submitBtn}
    </div>
  </div>
`
export const appendCITASettings = function (container) {
  container.appendChild(citaEl)
}
