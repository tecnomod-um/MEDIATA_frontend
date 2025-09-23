import React, { useLayoutEffect, useState, useContext, useMemo } from "react";
import ScrollSidebar from "../components/Common/ScrollSidebar/scrollSidebar.js";
import TutorialStyles from "./tutorial.module.css";
import Slide from '../components/Common/Slide/slide.js';

function Tutorial() {
  const [images, setImages] = useState([]);
  const [unionslides, setUnionSlides] = useState([]);
  const [slides, setSlides] = useState([]);
  const [GeneNameSlides, setGeneNameSlides] = useState([]);
  const [mutationCRMSlides, setMutationCRMSlides] = useState([]);
  const [OptionalSlides, setOptionalSlides] = useState([]);
  const [MultipleValuesSlides, setMultipleValuesSlides] = useState([]);
  const [NewVariableSlides, setNewVariableSlides] = useState([]);
  const [UseCaseSlides, setUseCaseSlides] = useState([]);


  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history)
      window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  /*
  useEffect(() => {
    const slideImages = [];
    for (let i = 1; i <= 6; i++) {
      const image = require(`../resources/images/tutorial/union${i}.png`);
      slideImages.push(image);
    }
    setUnionSlides(slideImages);
  }, []);

  useEffect(() => {
    const slideImages = [];
    for (let i = 1; i <= 6; i++) {
      const image = require(`../resources/images/tutorial/Slide${i}.png`);
      slideImages.push(image);
    }
    setSlides(slideImages);
  }, []);

  useEffect(() => {
    const slideImages = [];
    for (let i = 1; i <= 3; i++) {
      const image = require(`../resources/images/tutorial/Ex1.${i}.png`);
      slideImages.push(image);
    }
    setGeneNameSlides(slideImages);
  }, []);

  useEffect(() => {
    const slideImages = [];
    for (let i = 1; i <= 4; i++) {
      const image = require(`../resources/images/tutorial/Ex2.${i}.png`);
      slideImages.push(image);
    }
    setMutationCRMSlides(slideImages);
  }, []);

  useEffect(() => {
    const slideImages = [];
    for (let i = 1; i <= 3; i++) {
      const image = require(`../resources/images/tutorial/optional${i}.png`);
      slideImages.push(image);
    }
    setOptionalSlides(slideImages);
  }, []);

  useEffect(() => {
    const slideImages = [];
    for (let i = 1; i <= 6; i++) {
      const image = require(`../resources/images/tutorial/multiple_values${i}.png`);
      slideImages.push(image);
    }
    setMultipleValuesSlides(slideImages);
  }, []);

  useEffect(() => {
    const slideImages = [];
    for (let i = 8; i <= 13; i++) {
      const image = require(`../resources/images/tutorial/Figure${i}.png`);
      slideImages.push(image);
    }
    setNewVariableSlides(slideImages);
  }, []);

  useEffect(() => {
    const slideImages = [];
    for (let i = 1; i <= 6; i++) {
      const image = require(`../resources/images/tutorial/Q${i}.png`);
      slideImages.push(image);
    }
    setUseCaseSlides(slideImages);
  }, []);
*/
  const unionSteps = [
    'We first create a new graph for each UNION block and add the relevant elements, in our case, OMIM.',
    'We then configure the OMIM attributes in both graphs to display "has name" and "has synonym" as the attribute "label".',
    'We add each of the created blocks as a node...',
    '...And join them together using the special property "UNION".',
    'From this point, we can use the configured "label" to define filters.',
    'Selecting OMIM as an output yields the expected results.'
  ];

  const UseCaseSteps = [
    'First, we insert the CRM node by clicking on the CRM variable ("Variable browser" section).',
    'We link the CRM to the chromosome variable ("Add relations" button).',
    'And modify the attributes of both variables to select only those CRMs that overlap with the mutation (chr16:52565276) ("Set attributes" button).',
    'We link the CRM entity with its database and target genes. We also link the genes to their encoded proteins ("Add relations" button).',
    'We include the OMIM node for phenotypes and the optional relation between CRM and OMIM (information that is included additionally and does not act as a filter) ("Add optional relations" button).',
    'Select the output data of interest ("Select ouput") and run the query ("Query"). Save the results with "Export results" and "Export query".'
  ];

  const tutorialSteps = [
    'Select the first entity (subject node), in this case, "Gene", in the "Variable browser".',
    'Select the type of relation you want to use, in this case "encodes", in the "Pattern designer".',
    'Select the second entity (object node), in this case, "Protein"',
    'Select in "Select output" the data you want to show in the output (click on "+").',
    'Click on "Query" to launch the query.',
    'Click on "Export results" to download the data. Click on "Export query" to save the query.'
  ];

  const GeneNameSteps = [
    'After creating the "Gene - encodes - Protein" relation, select the node with the attributes to be edited ("Gene"), and click on "Set attributes".',
    'Enter the gene name in the corresponding attribute ("has name"), and click on "Set properties".',
    'Select the output data in "Select output", and execute the query ("Query"). Click on "Export results" to download the data. Click on "Export query" to save the query.'
  ];

  const mutationCRMSteps = [
    'Create the relations: "CRM - part of - Chromosome", and "CRM - involved in positive regulation of - Gene".',
    'Add attributes to the CRM node (sequence coordinates) ...',
    '... and to the Chromosome node (chromosome name).',
    'Select the data output (Genes) and run the query'
  ];

  const OptionalSteps = [
    'After creating the "Gene - encodes - Protein" relation, select the node "Protein", and click on "Add optional relations" to insert the optional relations of interest ("Protein - is orthologous of - Protein", and "Protein - molecularly interacts with - Protein").',
    'Select the "Gene" node and click on "Set attributes" to enter the gene name and the human taxon ID.',
    'Select the data output and run the query'
  ];

  const MultipleValuesSteps = [
    'Include the entity "CRM" and click on "Add relations".',
    'Select the "observed in" property and use the "Enter URI values" box.',
    'Enter the first URI (http://purl.obolibrary.org/obo/UBERON_0000948) and click "+".',
    'Enter the second URI (http://purl.obolibrary.org/obo/UBERON_0002107) and click "+".',
    'Click “OK” to enter the entity batch.',
    'Select the data output in "Select output" and click on "Query" to run the query.'
  ];

  const NewVariableSteps = [
    'Generate the relation "CRM - involved in positive regulation of - Gene".',
    'Assign the attributes corresponding to the gene (name TOX3, and human taxon ID).',
    'Select the CRM attributes that we are going to use to generate the new variables.',
    'Create the new variable in "Set bindings".',
    'Filter in "Set filters" the new variable.',
    'Select the data output in "Select output" and click on "Query" to run the query.'
  ];
  /*
    useEffect(() => {
      const importImages = async () => {
        const imageArray = [];
        for (let i = 1; i <= 11; i++) {
          if (i === 6) {
            const geneImage = await import(`../resources/images/tutorial/geneProps.png`);
            imageArray.push(geneImage.default);
          } else if (i === 7) {
            const protImage = await import(`../resources/images/tutorial/protProps.png`);
            imageArray.push(protImage.default);
          } else {
            const image = await import(`../resources/images/tutorial/Figure${i}.png`);
            imageArray.push(image.default);
          }
        }
        setImages(imageArray);
      }
      importImages();
    }, []);
  */
  const sections = useMemo(() => [
    'Introduction',
    'Query-building',
    'Data-filtering',
    'Optional-relations',
    'Multiple-Values',
    'Unique-values',
    'Count-entities',
    'Creating-and-Filtering-variables',
    'Unions',
    'Variables/Biological-entities',
    'Guided-Use-case',
  ], []);

  return (
    <div className={TutorialStyles.pageContainer}>
      <aside className={TutorialStyles.sidebar}>
        <ScrollSidebar sections={sections} offset={55} />
      </aside>

      {/* Introduction Section */}
      <div id="Introduction" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Introduction</h2>
            <span className={TutorialStyles.introText}>
              This tutorial is still incomplete. This section covers the main functionalities of INTUITION NOT MEDIATA with step-by-step guided examples
              to introduce the user to the building of biological queries graphically.
              These queries are executed in the BioGateway graph network.
              More advanced features and other examples are included
              in an <a href="https://github.com/juan-mulero/cisreg/blob/main/INTUITION_Tutorial.pdf" target="_blank" rel="noopener noreferrer">advanced tutorial</a>.
              <br />
              <br />
              In a graph, nodes represent different types of biological entities, such as genes, proteins or CRMs,
              and edges (or properties) are used to specify different types of relations that exist between two nodes
              (for example, {"<"}Gene{">"} {"<"}encoding{">"} {"<"}Protein{">"}).
              Some properties are also used to add attributes to entities.
            </span>
          </div>
        </div>
      </div>
      {/* How to Build a Query Section */}
      <div id="Query-building" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Query building made easy in 6 steps</h2>
            <span className={TutorialStyles.introText}>
              The query building process involves the creation of a search pattern by linking entities
              to their attributes and/or other entities.
              We take as an example the previous case, the query:<i> Which proteins do the different genes encode?</i>
              ({"<"}Gene{">"} {"<"}encodes{">"} {"<"}Protein{">"}).
            </span>
            <br />
            <br />
            <span className={TutorialStyles.introText}>
              <i>Note</i>: Links between entities can also be established by first introducing the two nodes of interest
              and then the relation between them. Following the previous example:
            </span>
          </div>
        </div>
      </div>
      {/* Data filtering */}
      <div id="Data-filtering" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Data filtering</h2>
            <span className={TutorialStyles.introText}>
              Linking two biological entities (or variables) by their relation (properties) is the simplest way to create a search pattern.
              A search pattern selects the desired information from the knowledge network.
              However, any biological entity can also be selected by its characteristics or attributes.
              For example, genes can be selected by their names.
              <br />
              <br />
              Below we illustrate a use case that extends the previous query to: <i>Which proteins are encoded by the TOX3 gene?</i>
            </span>
            <Slide images={GeneNameSlides} steps={GeneNameSteps} />
            <span className={TutorialStyles.introText}>
              <br />
              By defining the desired characteristics of biological entities (by clicking on "Set attibutes")
              we can select entities based on these characteristics (attributes).
              If the character is defined as "string" composed of letters and/or numbers we can use the operator {"'='"}
              to find only exact strings, or the operator {"'⊆'"} to find substrings contained in a larger string.
              If the character is only numeric we can find results equal to, larger, or smaller than, by the use of
              the operators {"'='"}, {"'>'"}, {"'≥'"}, {"'<'"}, {"'≤'"}.
              <br />
              <br />
              For example, we can query: <i>Which genes are regulated by enhancers that overlap with the chr16:52565276 mutation? </i>
              i.e. CRM sequences that positively regulate gene expression.
            </span>
            <Slide images={mutationCRMSlides} steps={mutationCRMSteps} />
          </div>
        </div>
      </div>
      {/* Optional relations */}
      <div id="Optional-relations" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Optional relations</h2>
            <span className={TutorialStyles.introText}>
              INTUITION also allows to include optional relations ("Add optional relations").
              As this is an optional pattern, the information is added if it exists, so it does not work as a filter.
              <br />
              <br />
              In this way, INTUITION allows queries like:
              <i> What proteins are encoded by the human TOX3 gene?
                Do these protein products interact with any other proteins?
                Is there information on proteins orthologous to those encoded by the human TOX3 gene?
              </i>
            </span>
            <Slide images={OptionalSlides} steps={OptionalSteps} />
          </div>
        </div>
      </div>
      {/* Multiple values */}
      <div id="Multiple-Values" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Multiple values</h2>
            <span className={TutorialStyles.introText}>
              To avoid creating repetitive queries when the general structure of the query is the same,
              but the characteristics of the entities are different, INTUITION allows a user to assign different values to the variables.
              <br />
              <br />
              For example, if we are interested in searching for cis-regulatory modules (CRM) identified in
              two or more tissues of interest, we do not need to repeat the same query for each tissue.
              We can specify different tissues in the "Enter URI values" box of “observed in” property.
              Click on "+" to include values and click on “OK” when all values are listed.
              As BioGateway uses semantic resources to identify entities, the values entered must be
              Uniform Resource Identifiers (URIs) corresponding to these resources. <a href="https://github.com/juan-mulero/cisreg/blob/main/INTUITION_Tutorial.pdf" target="_blank" rel="noopener noreferrer">Here</a> we
              include a table with the main vocabularies used for the proper use of URIs.
              <br />
              <br />
              <i>Which CRMs have been identified in heart (UBERON_0000948) and liver (UBERON_0002107)?</i>
            </span>
            <br />
            <span className={TutorialStyles.introText}>
              We can also add multiple values to the node that acts as the subject of the triple:
            </span>
          </div>
        </div>
      </div>
      {/* Unique values */}
      <div id="Unique-values" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Unique values</h2>
            <span className={TutorialStyles.introText}>
              The output table shows the biological entities that meet the biological selection criteria.
              Since a user can design complex query patterns and has the freedom to choose
              which entities they want to include in the output ("Select output" button), duplicate entities might appear in the result.
              <br />
              <br />
              For example, in the previous query (<i>Which CRMs have been identified in heart (UBERON_0000948) and liver (UBERON_0002107)?</i>)
              we can select the CRM sequences and tissues in the output ("Select output").
              But we can also select only the CRM sequences, or only the tissues.
              Since a CRM can be found in both the heart and the liver, those CRMs found in both tissues would appear duplicated
              if we only chose CRMs in the output. This is because the CRM fits the search pattern in both cases.
              For this reason, the "Distinct" button is activated for automatic filtering.
            </span>
          </div>
        </div>
      </div>

      {/* Count values */}
      <div id="Count-entities" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Count values</h2>
            <span className={TutorialStyles.introText}>
              On the other hand, activating the "Count" button displays the number of entities that fit the search pattern of the query.
              For example, following the example above:
              <i> How many CRMs have been identified in heart and liver?</i>
            </span>
          </div>
        </div>
      </div>
      {/* Creating and Filtering Variables */}
      <div id="Creating-and-Filtering-variables" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Creating and Filtering Variables</h2>
            <span className={TutorialStyles.introText}>
              INTUITION allow a user to create their own selection variables. This functionality is implemented in "Set bindings" button,
              in the "Pattern designer". For example, by subtracting the end and start positions of the CRMs, and adding "1" to this number,
              we obtain the length of the sequences in a new variable. Then, we can filter this new variable in the "Set filters" button.
              <br />
              <br />
              Below we illustrate an example: <i>Which CRMs with a length less than or equal to 500 bp positively regulate the human TOX3 gene?</i>
            </span>
            <Slide images={NewVariableSlides} steps={NewVariableSteps} />
          </div>
        </div>
      </div>
      {/* Unions Section */}
      <div id="Unions" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Union of queries</h2>
            <span className={TutorialStyles.introText}>
              INTUITION also allows a user to construct a new query from queries that address related biological aspects, by merging them. We illustrate this through a use case. For example, we want to retrieve the OMIM entities that contain the string "breast cancer" as a name or synonym (<i>Which OMIM entities contain "breast cancer" in their preferred label or alternative label?</i>). To do that, the steps outlined below need to be followed:
            </span>
            <Slide images={unionslides} steps={unionSteps} />
          </div>
        </div>
      </div>
      {/* Table of variables */}
      <div id="Variables/Biological-entities" className={TutorialStyles.contentContainer}>
        <h2 className={TutorialStyles.centeredHeading}>Variable/Biological entities</h2>
        <table className={TutorialStyles.variablesTable}>
          <tbody>
            <tr><td>CRM variable</td><td>cis regulatory module (currently only enhancer sequences).</td></tr>
            <tr><td>Gene variable</td><td>genes.</td></tr>
            <tr><td>Protein variable</td><td>proteins.</td></tr>
            <tr><td>OMIM variable</td><td>entities from OMIM ontology (mainly phenotypes).</td></tr>
            <tr><td>Molecular_interaction</td><td>entities from Molecular Interactions ontology (MI).</td></tr>
            <tr><td>crm2gene variable</td><td>relation between CRM and gene.</td></tr>
            <tr><td>gene2phen variable</td><td>relation between gene and phenotype.</td></tr>
            <tr><td>crm2phen variable</td><td>relation between CRM and phenotype.</td></tr>
            <tr><td>crm2tfac variable</td><td>relation between CRM and protein (transcription factor).</td></tr>
            <tr><td>Transcription factor variable</td><td>transcription factors (currently only proteins that interact with CRM).</td></tr>
            <tr><td>reg2targ variable</td><td>regulatory relation between proteins.</td></tr>
            <tr><td>prot2prot</td><td>molecular interaction relation between proteins.</td></tr>
            <tr><td>tfac2gene variable</td><td>relation between gene and protein.</td></tr>
            <tr><td>Database variable</td><td>databases.</td></tr>
            <tr><td>Chromosome variable</td><td>chromosomes.</td></tr>
            <tr><td>Reference_genome variable</td><td>genome assembly.</td></tr>
            <tr><td>TAD variable</td><td>topologically associated domain.</td></tr>
            <tr><td>Cellular_component variable</td><td>cellular components from Gene Ontology (GO).</td></tr>
            <tr><td>prot2cc variable</td><td>relation between protein and its cellular components.</td></tr>
            <tr><td>Molecular_function variable</td><td>molecular functions from GO.</td></tr>
            <tr><td>prot2mf</td><td>relation between protein and its molecular functions.</td></tr>
            <tr><td>Biological_process variable</td><td>biological processes from GO.</td></tr>
            <tr><td>prot2bp variable</td><td>relation between protein and its biological processes.</td></tr>
            <tr><td>Ortho variable</td><td>orthology relation between proteins.</td></tr>
            <tr><td>Root variable</td><td>top hierarchically class of NCBITaxon Ontology.</td></tr>
            <tr><td>Taxonomic_rank variable</td><td>top hierarchically class of NCBITaxon Ontology.</td></tr>
          </tbody>
        </table>
        <p className={TutorialStyles.lesserText}>
          The properties are detailed with examples and their domains <a href="https://github.com/juan-mulero/cisreg/blob/main/BGW_graphs.xlsx" target="_blank" rel="noopener noreferrer">here</a>.
        </p>
      </div>

      {/* Guided use case */}
      <div id="Guided-Use-case" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Guided Use Case</h2>
            <span className={TutorialStyles.introText}>
              A guided step-by-step guide to building Use Case 1.1 is shown below: <i>Is the rs4784227 mutation (chr16:52565276) located in any enhancer sequence linked to target genes in the network? What databases support the sequence and what are their target genes? Is the enhancer related to any disease? Which proteins are encoded by the genes?</i>
            </span>
            <Slide images={UseCaseSlides} steps={UseCaseSteps} />
          </div>
        </div>
      </div>

    </div >
  );
}

export default Tutorial;
