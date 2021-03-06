import * as React from 'react';

import { Accordion, AccordionTab } from 'primereact/components/accordion/Accordion';
import { Panel } from 'primereact/components/panel/Panel';

import { AccordionItemComponent } from '../common/AccordionItemComponent';
import { ApprovalComponent } from '../common/ApprovalComponent';

import { LoadingComponent } from '../common/LoadingComponent';
import { ErrorComponent } from '../common/ErrorComponent';

import { GenericError, ErrorService } from '../../services/ErrorTransmitter';
import { DocumentService } from '../../services/Document';
import { ExternalAppConfigService } from '../../services/ExternalAppConfig';

import Document from '../../models/Document';
import ExternalAppConfig from '../../models/ExternalAppConfig';

// Types
import { match } from 'react-router-dom';
interface NavParam {
    referralId: string;
    nodeId: number;
}
interface AccordionListProps {
    match: match<NavParam>;
    history: any;
}
interface AccordionListState {
    error: boolean;
    errorMessage: string;

    isValid: boolean;
    allChecked: boolean;
    documents: Document[];
    customerMessage: string;

    lazy: boolean;
    activeAccordion: number | null;
}
// End of Types

export class AccordionListComponent extends React.Component<AccordionListProps, AccordionListState> {
    constructor(props: AccordionListProps) {
        super(props);
        this.state = {
            error: false,
            errorMessage: 'no error, you shouldn\'t see this',
            customerMessage: 'empty message you shouldn\'t see this',
            allChecked: false,
            isValid: false,
            documents: [],
            lazy: false,
            activeAccordion: this.props.match.params.nodeId};
    }

    componentWillMount () {
        var errorMessage = 'Bu referans numarasına ait dökümanlar bulunamadı. Sürece kasadan devam ediniz.';
        ExternalAppConfigService.getExternalAppConfig(this.props.match.params.referralId).subscribe(
            (externalAppConfig: ExternalAppConfig) => {
                if (this.props.match.params.referralId === 'noDoc') {
                    this.setState({
                        error: true,
                        errorMessage: errorMessage
                    });
                    ErrorService.postError(new GenericError(errorMessage, this.props.match.params.referralId, 'mock'));
                } else {
                    console.log('get documents response', externalAppConfig.documentList);
                    this.setState({
                      isValid: true,
                      customerMessage: externalAppConfig.customerMessage,
                      documents: externalAppConfig.documentList,
                      allChecked: !externalAppConfig.documentList.some((value, index, array) => (!value.approved))
                    });
                }
            },(error) => {
                this.setState({
                    error: true,
                    errorMessage: errorMessage
                });
                ErrorService.postError(
                    new GenericError(errorMessage, this.props.match.params.referralId, JSON.stringify(error)));
            });
    }

    sendApproval = () => {
        console.log('approval comp post');
        var errorMessage = 'Referans kodu oluşturulma sırasında hata ile karşılaşıldı. Sürece kasadan devam ediniz.';
        DocumentService.postApproval(this.props.match.params.referralId, this.state.documents).subscribe(
            (referenceCode) => {
                if (this.props.match.params.referralId === 'noRef') {
                    this.setState({
                        error: true,
                        errorMessage: errorMessage
                    });
                    ErrorService.postError(new GenericError(errorMessage, this.props.match.params.referralId, 'mock'));
                } else {
                    console.log('approval response', referenceCode);
                    this.props.history.push({pathname: `/referenceCode`, state: {referenceCode: referenceCode}});
                }
            },
            (error) => {
                this.setState({
                    error: true,
                    errorMessage: errorMessage
                });
                ErrorService.postError(
                    new GenericError(errorMessage, this.props.match.params.referralId, JSON.stringify(error)));
            }
        );
    };

    onDocumentReadChecked = (key: number) => {
        let _documents = this.state.documents;
        if (_documents[key]) {
            _documents[key].approved = !_documents[key].approved;
        }

        let appHeaderHeight = (((document || {}).getElementById('app-header') || {}) as Element).clientHeight;
        window.scrollTo(0, appHeaderHeight + (14 * (key + 1)) / 2);

        this.setState({
            documents: _documents,
            allChecked: !_documents.some((value, index, array) => (!value.approved)),
            activeAccordion: key + 1
        });
    };

    onAccordionTabClose = (e: any) => {
        // console.log('clientHeight: ', e.originalEvent.target.clientHeight);

        let appHeaderHeight = (((document || {}).getElementById('app-header') || {}) as Element).clientHeight;

        window.scrollTo(0, appHeaderHeight + (e.originalEvent.target.clientHeight * e.index) / 2);

        this.setState({activeAccordion: e.index});
    }

    public render (): JSX.Element {
        const accordionItems = this.state.documents.map((item, index) => {
            return (
                <AccordionTab
                    key={index}
                    header={`${item.name}${item.approved ? '' : ' - Okunmamış'}`}
                >
                    <AccordionItemComponent
                        documentIndex={index}
                        document={item}
                        onDocumentReadCheckedCb={this.onDocumentReadChecked}
                        activeAccordion={this.state.activeAccordion}
                    />
                </AccordionTab>
            );
        });

        const customerMessage = this.state.customerMessage ? (
            <Panel className="ui-g-12">
                {this.state.customerMessage}
            </Panel>
            ) : null;

        return (
            this.state.error ?
                <ErrorComponent message={this.state.errorMessage}/>
                :
                this.state.isValid ? (
                    <div className="ui-g">
                        {customerMessage}
                        <div className="ui-g-12">
                            <Accordion
                                onTabClose={this.onAccordionTabClose}
                                activeIndex={this.state.activeAccordion}
                            >
                                {accordionItems}
                            </Accordion>
                        </div>
                        <div className="ui-g-12">
                            <ApprovalComponent allChecked={this.state.allChecked} approvalCb={this.sendApproval}/>
                        </div>
                    </div>)
                    : (
                    <div>
                        {'Lütfen Bekleyiniz...'}
                        <LoadingComponent/>
                    </div>)
        );
    }
}
